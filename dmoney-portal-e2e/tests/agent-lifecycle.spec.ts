import { APIRequestContext, BrowserContext, Page, expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AdminUsersPage } from '../pages/admin-users-page';
import { AppShell } from '../pages/app-shell';
import { CashInPage, DepositResult } from '../pages/cash-in-page';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/forgot-reset-pages';
import { LoginPage } from '../pages/login-page';
import { ProfilePage } from '../pages/profile-page';
import { REGISTERED_MESSAGE, RegisterPage } from '../pages/register-page';
import { SelfStatementPage } from '../pages/self-statement-page';
import { findCustomerWithRoom, findUserByEmail, waitForOtp, waitForResetToken } from '../utils/portal-api';
import { localDate, money, parseCsv, saveSelfStatementCsv } from '../utils/format';
import {
  ADMIN,
  AGENT_COMMISSION_RATE,
  CUSTOMER_DEPOSIT_AMOUNT,
  CUSTOMER_PHONE_OVERRIDE,
  SYSTEM,
  SYSTEM_DEPOSIT_AMOUNT,
  buildAgent,
} from '../utils/test-data';

/**
 * One ordered journey: register Agent -> Admin activates -> System funds -> Agent transacts -> password reset
 * -> Self Statement export. Every step is its own test so the report shows exactly where a run stops.
 *
 *   @smoke       positive (happy-path) checks only
 *   @regression  every check, including the negative ones
 */
test.describe.configure({ mode: 'serial' });

const agent = buildAgent();
const commission = CUSTOMER_DEPOSIT_AMOUNT * AGENT_COMMISSION_RATE;
const balanceAfterTopUp = money(SYSTEM_DEPOSIT_AMOUNT);
const balanceAfterCustomerDeposit = money(SYSTEM_DEPOSIT_AMOUNT - CUSTOMER_DEPOSIT_AMOUNT + commission);

let context: BrowserContext;
let page: Page;
let api: APIRequestContext;
let login: LoginPage;
let shell: AppShell;
let lastOtpStamp = '';
let systemDeposit: DepositResult;
let customerDeposit: DepositResult;
let customerPhone = '';
let csvFile = '';

/** Agent sign-in = password, then the OTP the portal would normally e-mail. */
async function loginAsAgent(password: string) {
  await login.open();
  await login.submitCredentials(agent.email, password);
  await login.expectOtpPrompt();
  const otp = await waitForOtp(api, agent.email, lastOtpStamp);
  lastOtpStamp = otp.stamp;
  await login.submitOtp(otp.code);
}

// A single browser context for the whole journey keeps it in one continuous video.
test.beforeAll(async ({ browser, playwright }, testInfo) => {
  context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(testInfo.project.outputDir, 'videos'), size: { width: 1280, height: 800 } },
  });
  page = await context.newPage();
  api = await playwright.request.newContext();
  login = new LoginPage(page);
  shell = new AppShell(page);
});

test.afterAll(async ({}, testInfo) => {
  const video = page.video();
  await context.close(); // flushes the recording
  await api.dispose();
  if (video) {
    const dest = testInfo.outputPath('full-journey.webm');
    await video.saveAs(dest);
    await testInfo.attach('full-journey-video', { path: dest, contentType: 'video/webm' });
  }
});

test.describe('Agent lifecycle on the DMoney portal', () => {
  test('TC01 Verify Agent registration is successful', { tag: ['@smoke', '@regression'] }, async () => {
    const register = new RegisterPage(page);
    await register.openFromHome();
    await register.fill(agent);
    const response = await register.submit();

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.user).toMatchObject({ email: agent.email, phone_number: agent.phone, role: 'Agent', status: 'pending' });
    await expect(page.getByText(REGISTERED_MESSAGE)).toBeVisible();
  });

  test('TC02 Verify registering again with the same phone number is rejected', { tag: '@regression' }, async () => {
    const register = new RegisterPage(page);
    await register.openFromHome();
    await register.fill({ ...agent, email: `again.${agent.email}`, nid: agent.nid });
    const response = await register.submit();

    expect(response.status()).not.toBe(201);
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test('TC03 Verify Admin login is successful', { tag: ['@smoke', '@regression'] }, async () => {
    await login.loginDirect(ADMIN.email, ADMIN.password);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toHaveValue(ADMIN.email);
  });

  test('TC04 Verify the new Agent appears in the Admin user list', { tag: ['@smoke', '@regression'] }, async () => {
    const users = new AdminUsersPage(page);
    await users.open();
    await users.searchByEmail(agent.email);

    const row = users.rowFor(agent.email);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(agent.phone);
    await expect(row).toContainText('Agent');
  });

  test('TC05 Verify the new Agent is initially inactive (pending)', { tag: ['@smoke', '@regression'] }, async () => {
    const users = new AdminUsersPage(page);
    const row = users.rowFor(agent.email);
    await expect(row.getByText('PENDING', { exact: true })).toBeVisible();
    await expect(row).toContainText('0.00');

    await users.openUser(agent.email);
    await expect(users.statusChip('PENDING')).toBeVisible();
  });

  test('TC06 Verify Admin can activate the Agent', { tag: ['@smoke', '@regression'] }, async () => {
    const users = new AdminUsersPage(page);
    const response = await users.activateCurrentUser();

    expect(response.status()).toBe(200);
    expect((await response.json()).user.status).toBe('active');
    await expect(page.getByText('User updated successfully')).toBeVisible();
    await expect(users.statusChip('ACTIVE')).toBeVisible();
  });

  test('TC07 Verify the Agent remains active after page reload', { tag: ['@smoke', '@regression'] }, async () => {
    const users = new AdminUsersPage(page);
    await page.reload();
    await expect(users.statusChip('ACTIVE')).toBeVisible();
    expect((await findUserByEmail(api, agent.email)).status).toBe('active');
  });

  test('TC08 Verify Admin logout works successfully', { tag: ['@smoke', '@regression'] }, async () => {
    await shell.logout();
    await expect(page.getByRole('button', { name: /Login/ })).toBeVisible();
  });

  test('TC09 Verify System login is successful', { tag: ['@smoke', '@regression'] }, async () => {
    await login.loginDirect(SYSTEM.email, SYSTEM.password);
    await expect(page.getByLabel('Email Address')).toHaveValue(SYSTEM.email);
    await expect(page.getByLabel('Full Name')).toHaveValue('SYSTEM');
  });

  test('TC10 Verify System can deposit 2000 Tk to the Agent', { tag: ['@smoke', '@regression'] }, async () => {
    const cashIn = new CashInPage(page);
    await cashIn.open();
    systemDeposit = await cashIn.deposit(agent.phone, SYSTEM_DEPOSIT_AMOUNT);

    expect(systemDeposit.status, JSON.stringify(systemDeposit.body)).toBe(201);
    expect(systemDeposit.body).toMatchObject({ amount: SYSTEM_DEPOSIT_AMOUNT, agentBalance: SYSTEM_DEPOSIT_AMOUNT });
    expect(systemDeposit.trnxId).toMatch(/^TXN/);
    await cashIn.expectReceipt(systemDeposit.trnxId);
  });

  test('TC11 Verify the System deposit creates the correct transaction record', { tag: ['@smoke', '@regression'] }, async () => {
    const statement = new SelfStatementPage(page);
    await shell.openSelfStatement();
    // Range spans UTC "today" and local "today" so the check also works around midnight.
    await statement.setRange(localDate(-1), localDate(1));

    const row = page.getByRole('row').filter({ hasText: systemDeposit.trnxId });
    await expect(row).toHaveCount(1);
    const record = SelfStatementPage.toRecord(await row.locator('td').allInnerTexts().then((c) => c.map((t) => t.replace(/\s+/g, ' ').trim())));
    expect(record).toMatchObject({
      sender: 'SYSTEM',
      receiver: agent.phone,
      type: 'System Deposit to Agent',
      debit: money(SYSTEM_DEPOSIT_AMOUNT),
    });
  });

  test('TC12 Verify System logout works successfully', { tag: ['@smoke', '@regression'] }, async () => {
    await shell.logout();
  });

  test('TC13 Verify the Agent can log in after activation', { tag: ['@smoke', '@regression'] }, async () => {
    await loginAsAgent(agent.password);
    await expect(page.getByText('Agent Dashboard')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toHaveValue(agent.email);
    await expect(page.getByText('ACTIVE', { exact: true })).toBeVisible();
  });

  test('TC14 Verify the Agent balance is exactly 2000 Tk', { tag: ['@smoke', '@regression'] }, async () => {
    const profile = new ProfilePage(page);
    await profile.expectBalance(balanceAfterTopUp);

    const statement = new SelfStatementPage(page);
    await shell.openSelfStatement();
    await statement.setRange(localDate(-1), localDate(1));
    await statement.expectCurrentBalance(balanceAfterTopUp);
  });

  test('TC15 Verify the Agent can deposit 500 Tk to an existing Customer', { tag: ['@smoke', '@regression'] }, async () => {
    customerPhone = CUSTOMER_PHONE_OVERRIDE ?? (await findCustomerWithRoom(api)).phone;
    test.info().annotations.push({ type: 'customer', description: customerPhone });

    const cashIn = new CashInPage(page);
    await cashIn.open();
    customerDeposit = await cashIn.deposit(customerPhone, CUSTOMER_DEPOSIT_AMOUNT);

    expect(customerDeposit.status, JSON.stringify(customerDeposit.body)).toBe(201);
    expect(customerDeposit.message).toBe('Deposit successful');
    expect(customerDeposit.trnxId).toMatch(/^TXN/);
    await expect(page.getByText('Deposit successful')).toBeVisible();
    await cashIn.expectReceipt(customerDeposit.trnxId);
  });

  test('TC16 Verify the Agent balance is updated correctly after the transaction', { tag: ['@smoke', '@regression'] }, async () => {
    // 2000 - 500 sent + 12.50 commission (2.5%)
    expect(customerDeposit.body).toMatchObject({ commission, currentBalance: Number(balanceAfterCustomerDeposit) });
    await page.getByText('CURRENT BALANCE').waitFor();
    await expect(page.getByText(`৳ ${balanceAfterCustomerDeposit}`)).toBeVisible();

    const profile = new ProfilePage(page);
    await profile.open();
    await profile.expectBalance(balanceAfterCustomerDeposit);
  });

  test('TC17 Verify the Customer deposit appears in the Agent Self Statement', { tag: ['@smoke', '@regression'] }, async () => {
    const statement = new SelfStatementPage(page);
    await shell.openSelfStatement();
    await statement.setRange(localDate(-1), localDate(1));

    const row = page.getByRole('row').filter({ hasText: customerDeposit.trnxId });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(agent.phone);
    await expect(row).toContainText(customerPhone);
    await expect(row).toContainText(money(CUSTOMER_DEPOSIT_AMOUNT));
    await expect(row).toContainText(money(commission));
  });

  test('TC18 Verify Agent logout works successfully', { tag: ['@smoke', '@regression'] }, async () => {
    await shell.logout();
    // Session is gone: a protected page bounces back to login.
    await page.goto('/agent/self-statement');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC19 Verify Agent password reset works successfully', { tag: ['@smoke', '@regression'] }, async () => {
    await login.open();
    await login.openForgotPassword();
    await new ForgotPasswordPage(page).requestLink(agent.email);

    const token = await waitForResetToken(api, agent.email);
    const reset = new ResetPasswordPage(page);
    await reset.open(token);
    await reset.setNewPassword(agent.newPassword);
  });

  test('TC20 Verify login with the old password fails after password reset', { tag: '@regression' }, async () => {
    await login.open();
    await login.submitCredentials(agent.email, agent.password);
    await login.expectLoginFailed();
  });

  test('TC21 Verify login with the new password succeeds', { tag: ['@smoke', '@regression'] }, async () => {
    await loginAsAgent(agent.newPassword);
    await expect(page.getByText('Agent Dashboard')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toHaveValue(agent.email);
  });

  test('TC22 Verify the Self Statement contains the expected transaction data', { tag: ['@smoke', '@regression'] }, async () => {
    const statement = new SelfStatementPage(page);
    await shell.openSelfStatement();
    await statement.setRange('2020-01-01', localDate(1));

    expect(await statement.headers()).toEqual([
      'Transaction ID', 'Sender Account', 'Receiver Account', 'Type', 'Debit', 'Credit', 'Balance', 'Date',
    ]);
    const records = (await statement.readAllRows()).map(SelfStatementPage.toRecord);
    expect(records).toHaveLength(2);

    expect(records.find((r) => r.transactionId === systemDeposit.trnxId)).toMatchObject({
      sender: 'SYSTEM',
      receiver: agent.phone,
      type: 'Top-up from SYSTEM',
      debit: '-',
      credit: money(SYSTEM_DEPOSIT_AMOUNT),
      balance: balanceAfterTopUp,
    });
    expect(records.find((r) => r.transactionId === customerDeposit.trnxId)).toMatchObject({
      sender: agent.phone,
      receiver: customerPhone,
      type: 'Deposit Commission',
      debit: money(CUSTOMER_DEPOSIT_AMOUNT),
      credit: money(commission),
      balance: balanceAfterCustomerDeposit,
    });
    await statement.expectCurrentBalance(balanceAfterCustomerDeposit);
  });

  test('TC23 Verify the Self Statement data is saved into the required CSV file', { tag: ['@smoke', '@regression'] }, async () => {
    const statement = new SelfStatementPage(page);
    const headers = await statement.headers();
    const rows = await statement.readAllRows();

    csvFile = saveSelfStatementCsv(headers, rows);

    expect(path.basename(csvFile)).toBe(`self_statement_${localDate()}.csv`);
    expect(fs.existsSync(csvFile)).toBe(true);
    const saved = parseCsv(fs.readFileSync(csvFile, 'utf8'));
    expect(saved[0]).toEqual(headers);
    expect(saved.slice(1)).toEqual(rows);
    expect(saved.flat()).toEqual(expect.arrayContaining([systemDeposit.trnxId, customerDeposit.trnxId]));
    await test.info().attach('self-statement-csv', { path: csvFile, contentType: 'text/csv' });
  });
});
