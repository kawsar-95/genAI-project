import { type Locator, type Page, expect } from '@playwright/test';

export type UserRole = 'Admin' | 'Agent' | 'Customer' | 'Merchant';

export class UserListPage {
  readonly page: Page;
  readonly userListMenu: Locator;
  readonly heading: Locator;
  readonly searchTypeSelect: Locator;
  readonly roleSelect: Locator;
  readonly searchButton: Locator;
  readonly table: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userListMenu = page.getByRole('link', { name: 'User List' });
    this.heading = page.getByRole('heading', { name: 'User List' });
    // MUI Selects here have no labelId, so scope each combobox by its FormControl label.
    this.searchTypeSelect = page
      .locator('.MuiFormControl-root', { hasText: 'Search Type' })
      .getByRole('combobox');
    this.roleSelect = page
      .locator('.MuiFormControl-root', { hasText: 'Select Role' })
      .getByRole('combobox');
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.table = page.getByRole('table');
    this.rows = this.table.locator('tbody tr');
  }

  async openFromMenu() {
    await this.page.goto('/profile');
    await this.userListMenu.click();
    await expect(this.page).toHaveURL(/\/admin\/users$/);
    await expect(this.heading).toBeVisible();
  }

  async searchByRole(role: UserRole) {
    await this.searchTypeSelect.click();
    await this.page.getByRole('option', { name: 'Search by Role' }).click();
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: role, exact: true }).click();

    const roleSearch = this.page.waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        res.url().endsWith(`/user/search/${role.toLowerCase()}`) &&
        res.ok(),
    );
    await this.searchButton.click();
    await roleSearch;
    await expect(this.table).toBeVisible();
  }

  /** Text of a cell in the given row, looked up by its column header. */
  async cellText(rowIndex: number, column: string): Promise<string> {
    const headers = await this.table.locator('thead th').allInnerTexts();
    const colIndex = headers.findIndex((h) => h.trim() === column);
    if (colIndex === -1) throw new Error(`Column "${column}" not found in ${headers.join(', ')}`);
    return (await this.rows.nth(rowIndex).locator('td').nth(colIndex).innerText()).trim();
  }
}
