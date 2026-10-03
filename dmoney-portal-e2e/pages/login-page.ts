import { Page, expect } from '@playwright/test';

export const LOGIN_FAILED = 'Login failed. Please input correct email/phone number or password.';

export class LoginPage {
  constructor(private readonly page: Page) {}

  private identifier = () => this.page.getByLabel(/Email or Phone Number/);
  private password = () => this.page.getByLabel(/^Password/);

  async open() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Welcome Back|Sign in/ }).or(this.identifier())).toBeVisible();
  }

  async submitCredentials(identifier: string, password: string) {
    await this.identifier().fill(identifier);
    await this.password().fill(password);
    await this.page.getByRole('button', { name: /Login/ }).click();
  }

  /** Admin and System log straight in. */
  async loginDirect(identifier: string, password: string) {
    await this.open();
    await this.submitCredentials(identifier, password);
    await expect(this.page).toHaveURL(/\/profile/);
  }

  /** Agents, customers and merchants get a 4-digit OTP step after the password check. */
  async submitOtp(code: string) {
    await this.page.getByLabel(/4-Digit OTP/).fill(code);
    await this.page.getByRole('button', { name: /Verify OTP/ }).click();
    await expect(this.page).toHaveURL(/\/profile/);
  }

  async expectOtpPrompt() {
    await expect(this.page.getByText('Verify Your Identity')).toBeVisible();
  }

  async expectLoginFailed() {
    await expect(this.page.getByText(LOGIN_FAILED)).toBeVisible();
    await expect(this.page).toHaveURL(/\/login$/);
  }

  async openForgotPassword() {
    await this.page.getByText('Forgot password?').click();
    await expect(this.page).toHaveURL(/\/forgot-password/);
  }
}
