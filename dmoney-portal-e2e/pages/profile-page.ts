import { Page, expect } from '@playwright/test';

export class ProfilePage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole('link', { name: 'My Profile' }).click();
    await expect(this.page).toHaveURL(/\/profile/);
  }

  balance() {
    return this.page.getByLabel('Current Balance (BDT)');
  }

  async expectBalance(amount: string) {
    await expect(this.balance()).toHaveValue(amount);
  }
}
