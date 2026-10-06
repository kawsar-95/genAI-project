# SM-M01 Requirement Analysis: Send Money must reject transfers to the sender's own account

| | |
|---|---|
| **Source** | Fetched [GitHub issue #3](https://github.com/kawsar-95/genAI-project/issues/3), unedited, no comments · BRD (`dmoney-web-react/README.md`) §7.3, §14, §15 |
| **Bug** | SM-M01 · Medium · Confidence High |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested |

## 1. Summary
- **Feature:** the same-account rule on Send Money.
- **User:** a Customer who uses the Send Money page or the API.
- **Goal:** a customer can never send money to their own account, whatever way the phone number is typed. Today a trailing space gets past the rule, and the customer loses the 5 Tk fee.

## 2. Business Flow
- **Main flow:** the customer enters the receiver's phone number and the amount → the system checks that the sender and receiver are different accounts → the transfer goes ahead or is rejected.
- **Key conditions:**
  - The sender and receiver must be different (BRD §7.3 precondition 2, §14 "`from_account` == `to_account`: Not allowed").
  - Accounts are identified by phone number (BRD §7).
- **Input → output:**
  - The receiver is the same account as the sender, however it is written → 400 "From account and to account cannot be the same", no money moves.
  - The receiver is a different customer → the normal Send Money flow.

## 3. Scope
- **In scope:**
  - The same-account rule, through both the Send Money page and the API.
  - Variants of the sender's own number that still identify the same account: leading or trailing spaces, and any other characters the system treats as equal when it looks up the account.
- **Out of scope:**
  - Validating the phone number format in general.
  - The same-account rule in Withdraw, Payment and Deposit.
  - Cleaning up existing ledger rows that were stored with a trailing space.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| UI: Send Money page | Direct | The receiver field is where the trailing space comes in |
| API: Send Money | Direct | Applies the same-account rule |
| DB: Users, Transactions | Direct | The account lookup treats some different spellings as equal, and ledger rows can be stored with a non-standard account number |
| Statement / balance views | Indirect | A credit row stored under a variant spelling looks like a different account |
| Roles | Direct: Customer | |

## 5. Risks
- **Functional:** a customer "sends money to themselves" and loses the 5 Tk fee.
- **Data:** ledger rows are stored under a non-standard account string, such as `'01686606903 '`. Exact-match reports and reconciliation will be wrong.
- **Security / fraud:** low on its own. Someone could exploit it to inflate their own transaction history, but each attempt costs the fee.
- **Performance:** none.

## 6. Gaps
- **Missing requirement:** the BRD never says how phone numbers are normalized. For example: are surrounding spaces ignored, are invisible characters removed, are non-ASCII digits accepted?
- **Missing requirement:** BRD §14 says a phone number is exactly 11 characters at registration, but there is no format rule for the accounts in a transaction request.
- **Assumption:** "the same account" means the same customer, not the same string. Any input that resolves to the sender's own account must be rejected.
- **Question:** should an invalid phone format (for example, characters that aren't digits) be rejected before the account lookup, with its own error message?
- **Question:** should ledger rows that already have a non-standard account string be corrected?

## 7. Edge Cases
- The receiver is the sender's own number with a trailing space.
- The receiver is the sender's own number with a leading space.
- The receiver is the sender's own number with an invisible character, such as a zero-width space pasted from a chat app.
- The receiver is the sender's own number written with full-width or other non-ASCII digits.
- The receiver is a *different* customer's number with surrounding spaces. This must still succeed and be credited to that customer.

## 8. Acceptance Criteria
- AC-1 — A customer who enters their own phone number as the receiver is told "From account and to account cannot be the same", and the transfer does not happen.
- AC-2 — The rule in AC-1 also applies when the customer's own number has spaces before or after it.
- AC-3 — The rule in AC-1 also applies to any other way of writing the number that the system resolves to the sender's own account.
- AC-4 — A transfer rejected under AC-1 to AC-3 does not change the customer's balance, and no service fee is charged.
- AC-5 — A transfer rejected under AC-1 to AC-3 adds no entry to the customer's statement.
- AC-6 — A transfer rejected under AC-1 to AC-3 is reported as a bad request (HTTP 400) by the API.
- AC-7 — When a different customer's number is entered with spaces before or after it, the transfer succeeds.
- AC-8 — In the case of AC-7, the receiver's statement shows the credit under their normal phone number.
