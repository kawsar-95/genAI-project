import { type Locator, type Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly otpInput: Locator;
  readonly verifyOtpButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email or Phone Number');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: /^Login/ });
    this.otpInput = page.getByLabel('Enter 4-Digit OTP');
    this.verifyOtpButton = page.getByRole('button', { name: /^Verify OTP/ });
  }

  async goto() {
    await this.page.goto('/login');
    // On a cold `next dev` server the form renders before React hydrates, and a click
    // in that window is silently lost. React tags hydrated nodes with __reactProps$<id>.
    await this.page.waitForFunction(() => {
      const button = document.querySelector('form button[type="submit"]');
      return !!button && Object.keys(button).some((key) => key.startsWith('__reactProps$'));
    });
  }

  async submitCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** Admin login: no OTP step, lands on /profile once the session is stored. */
  async login(email: string, password: string) {
    await this.submitCredentials(email, password);
    await expect(this.page).toHaveURL(/\/profile$/, { timeout: 15_000 }); // first visit compiles /profile in dev
  }

  /** Agent/Customer/Merchant login: credentials, then the emailed 4-digit OTP. */
  async loginWithOtp(email: string, password: string, getOtp: () => Promise<string>) {
    await this.submitCredentials(email, password);
    await expect(this.otpInput).toBeVisible();
    await this.otpInput.fill(await getOtp());
    await this.verifyOtpButton.click();
    await expect(this.page).toHaveURL(/\/profile$/, { timeout: 15_000 }); // first visit compiles /profile in dev
  }
}
