# SM-H02 Requirement Analysis: Daily transaction-count limit must hold under concurrent Send Money requests

| | |
|---|---|
| **Source** | Fetched [GitHub issue #2](https://github.com/kawsar-95/genAI-project/issues/2), unedited, no comments · BRD (`dmoney-web-react/README.md`) §4.5, §7.3, §8.1–§8.5, §14, §15 |
| **Bug** | SM-H02 · High · Confidence High |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested |

## 1. Summary
- **Feature:** daily and monthly outgoing limits for Customers.
- **User:** a Customer who sends money, as well as Payment and Cash Out, which count against the same limits.
- **Goal:** the limits (daily: 5,000 Tk and 10 transactions; monthly: 50,000 Tk and 50 transactions) hold even when several requests arrive at the same moment.

## 2. Business Flow
- **Main flow:** the customer sends money → the system adds up today's and this month's outgoing transactions (Send Money, Payment, Withdraw) → if the new transaction would go over a count or amount limit, it is rejected → otherwise the balance check runs and the money moves.
- **Key conditions:**
  - Limits apply to Customers only, and to outgoing transactions only (BRD §8.2).
  - The count is the number of distinct outgoing transactions in the period. The amount is the total debited, including fees (BRD §8.3).
  - The daily period starts at 00:00 UTC. The monthly period starts on the 1st at 00:00 UTC (BRD §4.5, §8.3).
  - Limits are read from configuration and can change without a release (BRD §8).
- **Input → output:**
  - Within the limits → 201 success.
  - Count or amount reached → 400 with a descriptive message and a `details` breakdown (BRD §8.3–§8.4).

## 3. Scope
- **In scope:**
  - The daily count limit under parallel Send Money requests (the reported case).
  - The daily amount limit and the monthly limits, which use the same check.
- **Out of scope:**
  - The wallet balance cap (10,000 Tk), which is an independent rule (BRD §8.5).
  - Limits for Agents, Merchants and Admins (BRD §8.2: not applicable).
  - The UI. The form disables its button while a request is in progress, so this bug can only be reached through the API.
- **Borderline (see Gaps):** parallel *mixed* requests, for example a Send Money and a Payment at the same moment. They share one limit, but the issue only reports Send Money.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| API: Send Money | Direct | Limit enforcement and error response |
| API: Payment, Cash Out (Withdraw) | Indirect | They share the same customer limits (BRD §8.2) |
| DB: Transactions, TransactionLimits | Direct | Usage is calculated from the ledger, and the limits come from configuration |
| Limit-checking service | Direct | Shared by Send Money, Payment and Withdraw |
| UI: Send Money page | None | Shows the API's error message |
| Roles | Direct: Customer | Other roles are not limited |

## 5. Risks
- **Functional:** customers can go over the limit the business set, so the limit gives no real protection.
- **Data:** the ledger ends up with more outgoing transactions than allowed, which breaks reporting and compliance checks.
- **Security / fraud:** the outgoing limit is a fraud-control measure. A script firing parallel requests can drain a compromised wallet beyond the daily cap.
- **Performance:** enforcing the limit correctly under concurrency needs serialization per customer. That adds waiting time under load and may cause lock time-outs.

## 6. Gaps
- **Conflict in the BRD:** §7.3 precondition 7 and §8.3 say the limits are checked *first*, before the balance check. The order isn't a business rule in itself, but it decides which error a customer sees when they are both over the limit and short of balance.
  - **Question:** must the limit error take priority over "Insufficient balance"? PR #8 now checks the balance first.
- **Missing requirement:** the BRD doesn't say whether limits must hold across *different* transaction types arriving at the same time (Send Money + Payment + Cash Out). §8.2 says the limit is cumulative over all three, which implies yes.
- **Missing requirement:** no rule says what a customer sees when the system is too busy to check the limit, for example on a lock time-out.
- **Assumption:** "transaction count" means completed outgoing transactions. Rejected attempts don't count. This matches BRD §8.3, which counts ledger debits.
- **Question:** BRD §8.4's sample message says "You can send at most …", but the amount message includes fees. Should customers be told the remaining amount *including* fees?

## 7. Edge Cases
- A customer with 9 of 10 transactions used sends 2 requests at the same moment. Exactly 1 must succeed.
- A customer with 0 used fires 14 requests at the same moment. Exactly 10 must succeed.
- A customer near the daily amount limit sends 2 large requests at the same moment. Only those that fit may succeed.
- Requests sent around 00:00 UTC, where the daily period resets mid-burst.
- A Send Money and a Payment fired together when one transaction is left.

## 8. Acceptance Criteria
- AC-1 — A customer can complete at most 10 outgoing transactions per UTC day, even when the requests are sent at the same moment.
- AC-2 — When several requests arrive together and only N transactions remain, exactly N of them succeed. The rest are rejected with the daily-limit message.
- AC-3 — A request rejected for the limit is a bad request (HTTP 400). Its response says which period's limit was reached and shows the used and remaining count and amount.
- AC-4 — A customer cannot send more than 5,000 Tk (fees included) per UTC day, even when the requests are sent at the same moment.
- AC-5 — The monthly limits (50 transactions, 50,000 Tk) hold in the same way, even when the requests are sent at the same moment.
- AC-6 — A request rejected for the limit moves no money: the balances are unchanged, and no new statement entry appears.
- AC-7 — Send Money, Payment and Cash Out together count toward one shared limit (BRD §8.2).
