# SM-L01 Requirement Analysis: Send Money must reject non-numeric amount formats

| | |
|---|---|
| **Source** | Fetched [GitHub issue #5](https://github.com/kawsar-95/genAI-project/issues/5), unedited, no comments · BRD (`dmoney-web-react/README.md`) §7.3, §14, §15 |
| **Bug** | SM-L01 · Low · Confidence High |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested |

## 1. Summary
- **Feature:** amount validation on the Send Money API.
- **User:** any client calling the API directly. The web page's number field can't produce these values.
- **Goal:** only plain numeric amounts are accepted. Hexadecimal (`"0x10"`), scientific notation (`"1e1"`) and lists (`[20]`) are rejected, because today they move money as 16, 10 and 20.

## 2. Business Flow
- **Main flow:** the client submits an amount → the system checks that it's a valid number greater than 0 → the minimum-amount check (10 BDT) follows → the money moves.
- **Key conditions:** an "invalid amount" is a 400 Bad Request (BRD §15).
- **Expected message**, given by the issue: `Amount must be a valid number greater than 0`.
- **Input → output:**
  - A plain number, or a plain numeric string → the normal flow.
  - Any other form → 400 with the message above, no money moves.

## 3. Scope
- **In scope:** amount values that are not plain decimal numbers: hexadecimal strings, scientific-notation strings, lists, booleans, objects and free text.
- **Out of scope:**
  - Decimal-place precision (SM-M02).
  - The minimum amount (BRD §7.3; already enforced).
  - The Send Money page, whose number field blocks these inputs.
  - Payment, Withdraw and Deposit, which have the same validation pattern.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| API: Send Money | Direct | Amount validation and error message |
| DB: Transactions | Indirect | Wrongly accepted amounts currently create ledger rows |
| UI: Send Money page | None | Its number input can't send these forms |
| API clients / integrations | Direct | The accepted input format becomes stricter |
| Roles | Direct: Customer | |

## 5. Risks
- **Functional:** the amount moved differs from what the caller sent or intended (`"0x10"` moves 16).
- **Data:** ledger entries are created from inputs no user would consider valid amounts.
- **Security:** low to medium. Loose parsing makes it easier to bypass validation in other places that assume a plain number.
- **Compatibility:** making the format stricter may break existing clients that send numeric strings. Plain numeric strings such as `"20"` should keep working.

## 6. Gaps
- **Missing requirement:** the BRD doesn't define a "valid amount" format. It doesn't say whether numeric *strings* (`"20"`) are allowed, or whether a JSON number is required. The documented request body uses a number (BRD §7.3: `"amount": 200`).
- **Assumption:** plain numeric strings such as `"20"` stay accepted for backward compatibility, because the issue only rejects non-plain forms.
- **Question:** must every invalid-amount case return exactly `Amount must be a valid number greater than 0`, including too many decimals (SM-M02)? Or may different kinds of invalid amount get different messages?
- **Question:** should leading or trailing spaces in a numeric string (`" 20 "`) be accepted or rejected?

## 7. Edge Cases
- `"0x10"`, which is hexadecimal and today moves 16.
- `"1e1"`, which is scientific notation and today moves 10.
- `[20]`, a one-element list, which today moves 20.
- `true`, `{}` and `"abc"`, which are other non-numeric types.
- `"20"`, a plain numeric string, which should still be accepted (see §6).

## 8. Acceptance Criteria
- AC-1 — An amount written in hexadecimal is rejected as a bad request (HTTP 400) with the message "Amount must be a valid number greater than 0".
- AC-2 — An amount written in scientific notation is rejected as a bad request (HTTP 400) with the message "Amount must be a valid number greater than 0".
- AC-3 — An amount sent as a list is rejected as a bad request (HTTP 400) with the message "Amount must be a valid number greater than 0".
- AC-4 — A request rejected under AC-1 to AC-3 moves no money: the sender's and receiver's balances are unchanged.
- AC-5 — A request rejected under AC-1 to AC-3 adds no entry to the sender's or the receiver's statement.
- AC-6 — A plain numeric amount of at least the 10 BDT minimum is still accepted, and exactly that amount is transferred.
