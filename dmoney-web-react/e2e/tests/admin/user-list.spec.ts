import { test, expect } from '@playwright/test';
import { UserListPage } from '../../pages/UserListPage';

// Runs with the admin session from e2e/admin_auth.json (see the `admin` project in playwright.config.ts).
test.describe('Admin - User List', () => {
  test('search by role Agent shows an Agent in the first row', async ({ page }) => {
    const userList = new UserListPage(page);

    await userList.openFromMenu();
    await userList.searchByRole('Agent');

    await expect(userList.rows.first()).not.toContainText('No users found');
    expect(await userList.cellText(0, 'Role')).toBe('Agent');
  });
});
