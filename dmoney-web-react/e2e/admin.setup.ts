import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ADMIN } from './test-data/users';
import { authFile, hasValidSession, roleName } from './utils/session';

setup('authenticate as admin', async ({ page }) => {
  setup.skip(hasValidSession('admin'), 'Reusing the unexpired admin session in admin_auth.json');

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(ADMIN.email, ADMIN.password);
  expect(await page.evaluate(() => localStorage.getItem('role'))).toBe(roleName('admin'));

  // Saves the `token` cookie and the localStorage session keys for the admin project's tests.
  await page.context().storageState({ path: authFile('admin') });
});
