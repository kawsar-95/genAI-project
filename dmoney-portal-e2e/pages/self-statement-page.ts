import { Page, expect } from '@playwright/test';

export interface StatementRow {
  transactionId: string;
  sender: string;
  receiver: string;
  type: string;
  debit: string;
  credit: string;
  balance: string;
  date: string;
}

export class SelfStatementPage {
  constructor(private readonly page: Page) {}

  /**
   * The statement defaults to "today" in UTC, which is yesterday for testers east of UTC, so tests always set
   * the range explicitly.
   */
  async setRange(from: string, to: string) {
    const dates = this.page.locator('input[type=date]');
    await dates.nth(0).fill(from);
    await dates.nth(1).fill(to);
    await expect(this.page.getByText(`from ${from} to ${to}`)).toBeVisible();
  }

  /** Retrying assertion: the balance line renders before the statement request has settled. */
  async expectCurrentBalance(amount: string) {
    await expect(this.page.getByText(/Current Balance: BDT/)).toHaveText(`Current Balance: BDT ${amount}`);
  }

  /** Resolves once the table shows data rows, or the "no transactions" empty state. */
  private async tableSettled() {
    await this.page
      .locator('tbody tr td:nth-child(2)')
      .first()
      .or(this.page.getByText('No transactions found'))
      .waitFor();
  }

  async headers(): Promise<string[]> {
    await this.tableSettled();
    return (await this.page.locator('thead th').allInnerTexts()).map((h) => h.trim());
  }

  /** Reads every page of the table. */
  async readAllRows(): Promise<string[][]> {
    const rows: string[][] = [];
    const next = this.page.getByRole('button', { name: 'Go to next page' });
    for (;;) {
      await this.tableSettled();
      const pageRows = await this.page
        .locator('tbody tr')
        .evaluateAll((trs) => trs.map((tr) => [...tr.children].map((td) => (td as HTMLElement).innerText.replace(/\s+/g, ' ').trim())));
      rows.push(...pageRows.filter((r) => r.length > 1));
      if (!(await next.isEnabled())) break;
      const firstId = pageRows[0][0];
      await next.click();
      await expect(this.page.locator('tbody tr').first().locator('td').first()).not.toHaveText(firstId);
    }
    return rows;
  }

  static toRecord(cells: string[]): StatementRow {
    const [transactionId, sender, receiver, type, debit, credit, balance, date] = cells;
    return { transactionId, sender, receiver, type, debit, credit, balance, date };
  }
}
