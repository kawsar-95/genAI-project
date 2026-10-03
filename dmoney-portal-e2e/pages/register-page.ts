import { Page, expect } from '@playwright/test';
import { AgentUser } from '../utils/test-data';

export const REGISTERED_MESSAGE = 'Registration successful. Your account is pending approval by an admin.';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async openFromHome() {
    await this.page.goto('/');
    await this.page.getByRole('banner').getByRole('link', { name: 'Sign Up' }).click();
    await expect(this.page).toHaveURL(/\/register$/);
  }

  async fill(user: AgentUser, role: 'Customer' | 'Agent' | 'Merchant' = 'Agent') {
    await this.page.getByRole('textbox', { name: 'Full Name' }).fill(user.name);
    await this.page.getByRole('textbox', { name: 'Email Address' }).fill(user.email);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(user.password);
    await this.page.getByRole('textbox', { name: 'Phone Number' }).fill(user.phone);
    await this.page.getByRole('textbox', { name: 'National ID (NID)' }).fill(user.nid);
    await this.page.getByRole('combobox').click();
    await this.page.getByRole('option', { name: new RegExp(role) }).click();
  }

  /** Submits the form and returns the API response so callers can assert on status and body. */
  async submit() {
    const responsePromise = this.page.waitForResponse((r) => r.url().includes('/user/register'));
    await this.page.getByRole('button', { name: /Create Account/ }).click();
    return responsePromise;
  }
}
