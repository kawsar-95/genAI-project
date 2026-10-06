# SM-M02 Requirement Analysis: Send Money amounts must not have more than two decimal places

| | |
|---|---|
| **Source** | Fetched [GitHub issue #4](https://github.com/kawsar-95/genAI-project/issues/4), unedited, no comments · BRD (`dmoney-web-react/README.md`) §4.2, §4.5, §7.3, §9, §14, §15 |
| **Bug** | SM-M02 · Medium · Confidence **Medium** (the expected result is implied, not stated) |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested. **AC-1 to AC-3 depend on the answer to the first question in §6.** |

## 1. Summary
- **Feature:** amount precision on Send Money.
- **User:** a Customer who uses the Send Money page or the API.
- **Goal:** amounts are kept to whole paisa (two decimal places), so the receipt, the ledger and the balances always agree. Today 10.555 is accepted, the receipt shows 10.55, and the ledger stores 10.555 and 15.555.

## 2. Business Flow
- **Main flow:** the customer enters an amount → the system validates it (a number, greater than 0, at least the 10 BDT minimum) → the sender is debited amount + 5 and the receiver is credited the amount → the receipt shows the amounts.
- **Key conditions:**
  - Minimum amount 10 BDT (BRD §7.3 precondition 5, §9).
  - Flat fee of 5 BDT (BRD §7.3, §9).
  - Limit amounts are stored with 2 decimal places (BRD §4.5: `DECIMAL(15,2)`).
  - The BRD states **no** decimal-place rule for transaction amounts.
- **Input → output:**
  - A 0–2 decimal amount → the normal flow, and the receipt equals the ledger.
  - A 3 or more decimal amount → rejected as invalid. This is *implied* by BDT having 2 decimals and by the form's 0.01 step; it isn't stated in the BRD.

## 3. Scope
- **In scope:**
  - Amounts with more than two decimal places, entered on the Send Money page or sent to the API.
  - The receipt agreeing with what the ledger stores.
- **Out of scope:**
  - The same defect in Deposit (CASHIN-M03).
  - Rounding of percentage-based fees (Payment and Withdraw are 1%), although the same precision question applies there.
  - Correcting existing ledger rows that have 3 decimal places.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| UI: Send Money page | Direct | The amount field and the receipt display |
| API: Send Money | Direct | Amount validation |
| DB: Transactions | Direct | The debit and credit values that get stored |
| Balance, statement, limits | Indirect | Balances and limit usage are totals of stored values, so sub-paisa amounts carry through |
| Roles | Direct: Customer | |

## 5. Risks
- **Functional:** the receipt shows a different amount from the one actually moved (10.55 vs 10.555).
- **Data:** balances drift by fractions of a paisa that can't be settled in real currency. Totals may not reconcile.
- **Security:** low. An attacker could probe rounding differences, but each transfer still costs the 5 Tk fee.
- **Performance:** none.

## 6. Gaps
- **Missing requirement (blocking):** the BRD never states how many decimal places an amount may have. This issue's expected result is *implied*: BDT has 2 decimals, and the form's field declares a 0.01 step. **Question:** confirm that amounts must have at most 2 decimal places, and whether a request with more is *rejected* or *rounded*.
- **Conflict in the BRD:** §4.2 lists `debit` as INTEGER and `credit` as DOUBLE. INTEGER would rule out decimals entirely, which contradicts how fees and decimal amounts are used. **Question:** which one is correct?
- **Assumption:** rejecting the request (not rounding it) is the expected behaviour, because the issue's expected result says "a 3-decimal amount is rejected".
- **Question:** what message should a customer see for too many decimals? BRD §15 only says an "invalid amount" is a 400.

## 7. Edge Cases
- `10.555`, which has 3 decimals and should be rejected.
- `10.55`, which has exactly 2 decimals and should be accepted, with the receipt and ledger both showing 10.55.
- `10.5` and `10`, which should be accepted.
- `10.550`, the same value written with a trailing zero. Its treatment is undefined (see §6).
- A very small fractional amount such as `0.001`, which is below the minimum anyway.

## 8. Acceptance Criteria
*AC-1 to AC-3 are provisional until the decimal rule in §6 is confirmed.*
- AC-1 — An amount with more than two decimal places is rejected on the Send Money page before anything is sent, with a message that explains the rule.
- AC-2 — The API rejects an amount with more than two decimal places as a bad request (HTTP 400).
- AC-3 — An amount rejected under AC-1 or AC-2 moves no money, and no statement entry is added.
- AC-4 — For an amount with up to two decimal places, the receipt shows exactly the amount the receiver was credited.
- AC-5 — For an amount with up to two decimal places, the sender's statement shows a debit of exactly that amount plus the 5 BDT fee.
