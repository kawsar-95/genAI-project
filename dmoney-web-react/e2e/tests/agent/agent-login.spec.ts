import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { AGENT } from '../../test-data/users';
import {
  OTP_VALIDITY_MS,
  findLatestOtpEmail,
  isOtpExpired,
  waitForFreshOtpEmail,
  type OtpEmail,
} from '../../utils/gmail';

const AGENT_EMAIL = AGENT.email;
const AGENT_PASSWORD = AGENT.password;

// Tests the login itself, so start logged out instead of with e2e/agent_auth.json.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Agent - Login with email OTP', () => {
  test('ignores the old OTP email and logs in with the new one', async ({ page }) => {
    test.setTimeout(120_000);
    const loginPage = new LoginPage(page);

    // Whatever OTP mail is already in the inbox is from an earlier login and must not be used.
    const oldEmail = await findLatestOtpEmail(AGENT_EMAIL);

    await loginPage.goto();
    // Small allowance for clock skew between this machine and Gmail.
    const since = new Date(Date.now() - 5_000);
    let usedEmail: OtpEmail | undefined;
    await loginPage.loginWithOtp(AGENT_EMAIL, AGENT_PASSWORD, async () => {
      usedEmail = await waitForFreshOtpEmail({ to: AGENT_EMAIL, since });
      return usedEmail.otp;
    });

    expect(usedEmail!.id).not.toBe(oldEmail?.id);
    expect(usedEmail!.receivedAt.getTime()).toBeGreaterThanOrEqual(since.getTime());
    expect(isOtpExpired(usedEmail!)).toBe(false);
    await expect(page.getByText('Logged in as')).toBeVisible();
    await expect(page.getByText('Agent', { exact: true }).first()).toBeVisible();
  });
});

// The expired-mail case can't be forced against a real inbox on demand, so these tests
// stub the Gmail API (no browser) and drive the mailbox contents directly.
test.describe('Agent - OTP email expiry handling (stubbed Gmail)', () => {
  type FakeMail = { id: string; otp: string; receivedAt: number };
  let inbox: FakeMail[];
  let realFetch: typeof fetch;
  let realToken: string | undefined;

  const mail = (id: string, otp: string, ageMs: number): FakeMail => ({ id, otp, receivedAt: Date.now() - ageMs });
  const after = (ms: number, fn: () => void) => setTimeout(fn, ms);

  test.beforeEach(() => {
    inbox = [];
    realFetch = globalThis.fetch;
    realToken = process.env.GMAIL_ACCESS_TOKEN;
    process.env.GMAIL_ACCESS_TOKEN = 'stub-token';
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      const newest = inbox.at(-1);
      if (url.includes('/messages?')) {
        return Response.json({ messages: newest ? [{ id: newest.id }] : [] });
      }
      const m = inbox.find((x) => url.includes(`/messages/${x.id}?`))!;
      const body = `Hello Test Agent,\n\nYour One-Time Password (OTP) for DMoney login is:\n\n  ${m.otp}\n\nThis OTP is valid for 2 minutes.`;
      return Response.json({
        id: m.id,
        internalDate: String(m.receivedAt),
        payload: { mimeType: 'text/plain', body: { data: Buffer.from(body).toString('base64url') } },
      });
    }) as typeof fetch;
  });

  test.afterEach(() => {
    globalThis.fetch = realFetch;
    if (realToken === undefined) delete process.env.GMAIL_ACCESS_TOKEN;
    else process.env.GMAIL_ACCESS_TOKEN = realToken;
  });

  test('skips an expired OTP email and waits for the new one', async () => {
    inbox.push(mail('old', '1111', OTP_VALIDITY_MS + 60_000)); // 3 minutes old: expired
    after(400, () => inbox.push(mail('new', '4821', 0)));

    const email = await waitForFreshOtpEmail({ to: AGENT_EMAIL, since: new Date(Date.now() - 5_000), intervalMs: 100 });

    expect(email.id).toBe('new');
    expect(email.otp).toBe('4821');
  });

  test('skips an unexpired OTP email sent before this login', async () => {
    // Still inside its 2-minute window, but the new login replaced this OTP on the server.
    inbox.push(mail('previous-login', '2222', 30_000));
    after(400, () => inbox.push(mail('new', '7319', 0)));

    const email = await waitForFreshOtpEmail({ to: AGENT_EMAIL, since: new Date(Date.now() - 5_000), intervalMs: 100 });

    expect(email.otp).toBe('7319');
  });

  test('fails instead of using an expired OTP when no new email arrives', async () => {
    inbox.push(mail('old', '1111', OTP_VALIDITY_MS + 60_000));

    await expect(
      waitForFreshOtpEmail({ to: AGENT_EMAIL, since: new Date(Date.now() - 5_000), timeoutMs: 500, intervalMs: 100 }),
    ).rejects.toThrow(/No new OTP email/);
  });

  test('treats an OTP about to expire as expired', () => {
    expect(isOtpExpired({ id: 'a', otp: '1', receivedAt: new Date(Date.now() - OTP_VALIDITY_MS + 5_000) })).toBe(true);
    expect(isOtpExpired({ id: 'b', otp: '1', receivedAt: new Date(Date.now() - 30_000) })).toBe(false);
  });
});
