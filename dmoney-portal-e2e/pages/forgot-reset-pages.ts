import { Page, expect } from '@playwright/test';

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  async requestLink(emailOrPhone: string) {
    await this.page.getByLabel(/Email or Phone Number/).fill(emailOrPhone);
    await this.page.getByRole('button', { name: /Send Reset Link/ }).click();
    await expect(
      this.page.getByText('A password reset link has been sent to your registered Gmail address.'),
    ).toBeVisible();
  }
}

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  async open(token: string) {
    await this.page.goto(`/reset-password?token=${token}`);
    await expect(this.page.getByText('Set New Password')).toBeVisible();
  }

  async setNewPassword(password: string) {
    await this.page.getByLabel(/^New Password/).fill(password);
    await this.page.getByLabel(/^Confirm New Password/).fill(password);
    await this.page.getByRole('button', { name: /Reset Password/ }).click();
    await expect(this.page.getByText('Password Reset!')).toBeVisible();
    await expect(this.page).toHaveURL(/\/login$/, { timeout: 20_000 });
  }
}
