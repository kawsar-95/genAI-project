import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { AGENT } from './test-data/users';
import { getLatestOtp } from './utils/gmail';
import { authFile, hasValidSession, roleName } from './utils/session';

setup('authenticate as agent', async ({ page }) => {
  // Each agent login needs a new OTP email, so keep using the saved session while it is valid.
  setup.skip(hasValidSession('agent'), 'Reusing the unexpired agent session in agent_auth.json');
  setup.setTimeout(120_000); // includes waiting for the OTP email

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  // Only accept an OTP mailed for this login (small allowance for clock skew with Gmail).
  const since = new Date(Date.now() - 5_000);
  await loginPage.loginWithOtp(AGENT.email, AGENT.password, () => getLatestOtp({ to: AGENT.email, since }));
  expect(await page.evaluate(() => localStorage.getItem('role'))).toBe(roleName('agent'));

  // Saves the `token` cookie and the localStorage session keys for the agent project's tests.
  await page.context().storageState({ path: authFile('agent') });
});
