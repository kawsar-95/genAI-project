# SM-L03 Requirement Analysis: A non-string receiver must be a validation error, not an internal error

| | |
|---|---|
| **Source** | Fetched [GitHub issue #7](https://github.com/kawsar-95/genAI-project/issues/7), unedited, no comments · BRD (`dmoney-web-react/README.md`) §7.3, §8.3, §15 |
| **Bug** | SM-L03 · Low · Confidence Low (originally found by code trace, not run) |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested |

## 1. Summary
- **Feature:** type validation of the receiver account and safe error responses on Send Money.
- **User:** any client calling the API directly. The web page always sends text.
- **Goal:** a receiver sent as a list or another non-text value is rejected as a validation error (400). The response doesn't expose internal details, and no money moves. Today it's expected to return a 500 that contains the raw internal validation message.

## 2. Business Flow
- **Main flow:** the client submits a sender, a receiver and an amount → the system validates the inputs → the business checks run → the money moves.
- **Key conditions:**
  - Validation and business-rule errors are 400 (BRD §15).
  - 500 is reserved for real internal failures, such as a database error (BRD §15).
  - Account identifiers are phone numbers, which are text (BRD §7).
- **Input → output:**
  - A receiver that isn't text → 400 with a business-level message, no internal detail, no ledger change.
  - A real internal failure → 500 with a generic message only.

## 3. Scope
- **In scope:**
  - A receiver sent as a list, an object or another non-text type.
  - Removing internal error text from Send Money's error responses.
- **Out of scope:**
  - A missing receiver (SM-H01).
  - The global error handler and other endpoints that also echo raw errors (CASHIN-M04, security findings S-series).
  - The web page, which can't send these values.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| API: Send Money | Direct | Input validation and the shape of error responses |
| DB: Users, Transactions | Indirect | A list receiver can currently match an account lookup. No rows are written because of a rollback, but that is accidental |
| UI | None | |
| Logging / monitoring | Indirect | Full error detail should go only to server logs |
| Roles | Direct: Customer (the precondition checks run first) | |

## 5. Risks
- **Functional:** the client gets a 500 for its own mistake, so it can't tell whether to retry or fix the request.
- **Data:** low today, because the transaction rolls back. But a list matching the account lookup shows that inputs are reaching the database unvalidated.
- **Security:** returning internal validation text reveals model, field and framework details that help an attacker probe the system (information disclosure).
- **Performance:** the request runs most of the business checks before it fails, which wastes database work.

## 6. Gaps
- **Missing requirement:** the BRD has no rule on the *type* of account fields in a request. It only shows them as strings in the sample body (§7.3).
- **Missing requirement:** the BRD doesn't say what an error response may contain. "No internal detail" comes from the issue's expected result, not from the BRD.
- **Question:** what exact message should a non-text account get? Should it be the same as for a missing account (SM-H01)?
- **Precondition note:** to reproduce the original bug, the sender must have daily quota left (BRD §8.1), at least 25 BDT, and an active receiver. Otherwise an earlier check answers first.

## 7. Edge Cases
- A receiver sent as a one-element list containing a valid customer number.
- A sender sent as a list.
- A receiver sent as an object.
- A receiver sent as a number instead of text.
- A form-encoded request that sends the receiver as a list (`to_account[]=…`).

## 8. Acceptance Criteria
- AC-1 — A Send Money request whose receiver is not given as text is rejected as a bad request (HTTP 400).
- AC-2 — A Send Money request whose sender is not given as text is rejected as a bad request (HTTP 400).
- AC-3 — The response to a request rejected under AC-1 or AC-2 contains no internal system or framework detail.
- AC-4 — A request rejected under AC-1 or AC-2 moves no money: the balances are unchanged.
- AC-5 — A request rejected under AC-1 or AC-2 adds no statement entry for any account.
- AC-6 — When Send Money fails for an internal reason, the response says only that an internal error happened, without technical detail.
