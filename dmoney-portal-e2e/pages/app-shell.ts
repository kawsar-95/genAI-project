import { Page, expect } from '@playwright/test';

/** Header / navigation shared by every logged-in screen. */
export class AppShell {
  constructor(private readonly page: Page) {}

  async logout() {
    await this.page.getByRole('banner').locator('[class*=MuiAvatar]').first().click();
    await this.page.getByText('🚪 Logout').click();
    await expect(this.page).toHaveURL(/\/login$/);
  }

  async openSelfStatement() {
    await this.page.getByRole('link', { name: 'Self Statement' }).click();
    await expect(this.page).toHaveURL(/\/agent\/self-statement/);
  }
}
