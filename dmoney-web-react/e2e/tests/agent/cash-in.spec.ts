import { test, expect } from '@playwright/test';
import { CashInPage } from '../../pages/CashInPage';
import { CUSTOMER } from '../../test-data/users';
import { getBalance, sessionToken } from '../../utils/dmoneyApi';

const AMOUNT = 100;
const CUSTOMER_WALLET_CAP = 10_000;

// Runs with the agent session from e2e/agent_auth.json (see the `agent` project in playwright.config.ts).
test.describe('Agent - Cash In', () => {
  test('agent cashes in 100 taka to a customer successfully', async ({ page, request }) => {
    const cashInPage = new CashInPage(page);
    await cashInPage.openFromMenu();

    const token = await sessionToken(page);
    const balanceBefore = await getBalance(request, token, CUSTOMER.phone);
    expect(
      balanceBefore + AMOUNT,
      `Customer ${CUSTOMER.phone} has ${balanceBefore} tk; cash in would pass the ${CUSTOMER_WALLET_CAP} tk cap. Set CUSTOMER_PHONE in e2e/.env.`,
    ).toBeLessThanOrEqual(CUSTOMER_WALLET_CAP);

    const { status, body } = await cashInPage.cashIn(CUSTOMER.phone, AMOUNT);

    await test.step('backend accepts the deposit', () => {
      expect(status, body.message).toBe(201);
      expect(body.message).toBe('Deposit successful');
      expect(body.trnxId).toMatch(/^TXN[A-Z0-9]{10}$/);
    });

    await test.step('page shows the successful transaction', async () => {
      await expect(cashInPage.successMessage).toBeVisible();
      await expect(cashInPage.transactionId).toHaveText(body.trnxId!);
      await expect(cashInPage.totalAmount).toHaveText('৳ 100.00');
      await expect(cashInPage.errorAlert).toBeHidden();
    });

    await test.step('customer wallet is credited by 100 taka', async () => {
      expect(await getBalance(request, token, CUSTOMER.phone)).toBeCloseTo(balanceBefore + AMOUNT, 2);
    });
  });
});
