import { Locator, Page, expect } from '@playwright/test';

export class AdminUsersPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole('link', { name: 'User List' }).click();
    await expect(this.page).toHaveURL(/\/admin\/users$/);
  }

  async searchByEmail(email: string) {
    await this.page.getByRole('combobox').first().click();
    await this.page.getByRole('option', { name: 'Search by Email' }).click();
    await this.page.getByLabel('Enter Email').fill(email);
    await this.page.getByRole('button', { name: 'SEARCH' }).click();
  }

  rowFor(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }

  async openUser(email: string) {
    await this.rowFor(email).getByRole('button', { name: 'VIEW' }).click();
    await expect(this.page).toHaveURL(/\/admin\/users\/\d+$/);
  }

  /** Account-status chip on the user detail page (exact + case-sensitive, so it ignores the dropdown's "Active"). */
  statusChip(status: 'PENDING' | 'ACTIVE' | 'SUSPENDED') {
    return this.page.getByText(status, { exact: true });
  }

  async activateCurrentUser() {
    await this.page.getByRole('button', { name: 'Edit User' }).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Pending' }).click();
    await this.page.getByRole('option', { name: 'Active' }).click();
    const responsePromise = this.page.waitForResponse(
      (r) => r.url().includes('/user/update/') && r.request().method() === 'PATCH',
    );
    await this.page.getByRole('button', { name: 'Save Changes' }).click();
    return responsePromise;
  }
}
