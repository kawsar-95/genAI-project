import { type Locator, type Page, expect } from '@playwright/test';

export interface CashInResponse {
  status: number;
  body: { message: string; trnxId?: string; currentBalance?: number };
}

export class CashInPage {
  readonly page: Page;
  readonly cashInMenu: Locator;
  readonly customerPhoneInput: Locator;
  readonly amountInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly successMessage: Locator;
  readonly transactionId: Locator;
  readonly totalAmount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cashInMenu = page.getByRole('link', { name: 'Cash In', exact: true });
    this.customerPhoneInput = page.getByLabel('Customer Phone Number');
    this.amountInput = page.getByLabel('Amount (BDT)');
    this.submitButton = page.getByRole('button', { name: /^Cash In/ });
    // MUI Alert only: getByRole('alert') would also match Next.js's empty route announcer.
    this.errorAlert = page.locator('.MuiAlert-root');
    // Success panel: a message line, then "label / value" pairs (Transaction ID, Total Amount, ...).
    this.successMessage = page.getByText('Deposit successful', { exact: true });
    this.transactionId = this.resultValue('Transaction ID');
    this.totalAmount = this.resultValue('Total Amount');
  }

  private resultValue(label: string): Locator {
    return this.page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
  }

  async openFromMenu() {
    await this.page.goto('/profile');
    await this.cashInMenu.click();
    await expect(this.page).toHaveURL(/\/agent\/cash-in$/);
  }

  /** Submits the form and returns the backend's answer (it uses HTTP 208 for business rejections). */
  async cashIn(customerPhone: string, amount: number): Promise<CashInResponse> {
    await this.customerPhoneInput.fill(customerPhone);
    await this.amountInput.fill(String(amount));

    const depositResponse = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().endsWith('/transaction/deposit'),
    );
    await this.submitButton.click();
    const res = await depositResponse;
    return { status: res.status(), body: await res.json() };
  }
}
