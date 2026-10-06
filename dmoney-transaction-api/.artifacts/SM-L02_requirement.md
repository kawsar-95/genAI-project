# SM-L02 Requirement Analysis: Send Money receipt "Total Amount" must include the service fee

| | |
|---|---|
| **Source** | Fetched [GitHub issue #6](https://github.com/kawsar-95/genAI-project/issues/6), unedited, no comments · BRD (`dmoney-web-react/README.md`) §7.3, §9, §12 |
| **Bug** | SM-L02 · Low · Confidence **Low** (no requirement defines the receipt) |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested. **Provisional:** they depend on the product decision in §6. |

## 1. Summary
- **Feature:** the success receipt on the Send Money page.
- **User:** a Customer who has just sent money from the web app.
- **Goal:** the receipt shows what the transfer actually cost the customer. Today "Total Amount" shows only the amount sent (৳20.00), while ৳25.00 (amount + 5 fee) was debited.

## 2. Business Flow
- **Main flow:** the customer sends money → the transfer succeeds → the page shows a receipt with the transaction ID, the amount, the service fee and the remaining balance.
- **Key conditions:**
  - The sender is debited the amount + 5 BDT (BRD §7.3 ledger entry 1, §9).
  - The receiver is credited the amount.
- **Input → output:** a successful transfer of X shows X, the fee of 5, and a total equal to X + 5, which is what was debited.

## 3. Scope
- **In scope:** the amount fields on the Send Money receipt and their labels.
- **Out of scope:**
  - The API response. It already returns the fee and the current balance.
  - The same "Total Amount" label on the agent cash-in, agent payment, customer cash-out and customer payment receipts.
  - Printing or exporting receipts.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| UI: Send Money page (receipt) | Direct | Labels and values |
| API: Send Money | None (optional) | Could return the total debited so the page doesn't calculate it |
| DB | None | |
| Other receipt pages | Indirect | They use the same label and have the same ambiguity |
| Roles | Direct: Customer | |

## 5. Risks
- **Functional:** customers misread what they paid and may raise disputes or support tickets.
- **Data:** none. The ledger is correct; only the display is misleading.
- **Security:** none.
- **Performance:** none.

## 6. Gaps
- **Missing requirement (blocking):** the BRD doesn't define the Send Money receipt at all. §12 only lists the page, and §7.5 defines a receipt for Stripe cash-in only. That is why the issue's confidence is Low.
  - **Question for product:** which fields must the receipt show, and what does "Total Amount" mean: the amount sent, or the amount debited?
- **Assumption:** "Total Amount" means the total debited from the sender (amount + fee), as the issue's expected result says.
- **Question:** must all five receipt pages use the same wording for the same concept?

## 7. Edge Cases
- Sending exactly the 10 BDT minimum, where the total should be 15.00.
- Sending an amount with 2 decimals (10.55), where the total should be 15.55.
- A fee rule that changes later (the fee comes from configuration, BRD §9). The receipt must reflect the actual fee charged.
- A successful response that doesn't include a fee. The receipt must not silently show a wrong total.

## 8. Acceptance Criteria
*Provisional until product confirms the meaning of "Total Amount" (§6).*
- AC-1 — After a successful Send Money, the receipt shows the amount the receiver gets.
- AC-2 — After a successful Send Money, the receipt shows the service fee that was charged.
- AC-3 — The receipt's "Total Amount" equals the amount the sender's statement shows as debited for that transaction.
- AC-4 — Each amount on the receipt is labelled so that a customer can tell the amount sent, the fee and the total apart.
