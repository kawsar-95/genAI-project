import { Page, expect } from '@playwright/test';

export interface DepositResult {
  status: number;
  trnxId: string;
  message: string;
  body: Record<string, unknown>;
}

/** Cash In screen. System and Agent accounts share it: System funds agents, agents fund customers. */
export class CashInPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole('link', { name: 'Cash In' }).click();
    await expect(this.page).toHaveURL(/\/agent\/cash-in/);
  }

  async deposit(toPhone: string, amount: number): Promise<DepositResult> {
    await this.page.getByPlaceholder("Enter customer's phone number").fill(toPhone);
    await this.page.getByPlaceholder('Enter amount in BDT').fill(String(amount));
    const responsePromise = this.page.waitForResponse(
      (r) => r.url().includes('/transaction/deposit') && r.request().method() === 'POST',
    );
    await this.page.getByRole('button', { name: /Cash In/ }).click();
    const response = await responsePromise;
    const body = await response.json();
    return { status: response.status(), trnxId: body.trnxId, message: body.message, body };
  }

  async expectReceipt(trnxId: string) {
    await expect(this.page.getByText(trnxId)).toBeVisible();
  }
}
