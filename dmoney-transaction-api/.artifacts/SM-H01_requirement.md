# SM-H01 Requirement Analysis: Send Money must reject a request with a missing account

| | |
|---|---|
| **Source** | Fetched [GitHub issue #1](https://github.com/kawsar-95/genAI-project/issues/1), unedited, no comments · BRD (`dmoney-web-react/README.md`) §7.3, §14, §15 |
| **Bug** | SM-H01 · High · Confidence High |
| **Date** | 2026-10-07 |
| **Acceptance criteria** | Written because the issue has none and the fix still has to be tested |

## 1. Summary
- **Feature:** server-side validation of the sender and receiver accounts on Send Money.
- **User:** any logged-in Customer, or any client that calls the Send Money API directly.
- **Goal:** a request that leaves out the sender or the receiver account is rejected as a validation error. It must never stop the service for everyone else.

## 2. Business Flow
- **Main flow:** the customer submits sender account, receiver account and amount → the system checks that both accounts exist → the remaining checks run in order: different accounts, both Customers, both active, minimum amount, limits, balance → the money moves.
- **Key conditions:**
  - Both accounts must exist (BRD §7.3, precondition 1).
  - An account that is not supplied cannot exist, so this is a validation failure.
- **Input → output:**
  - Sender account missing → 400 validation error, no money moves.
  - Receiver account missing → 400 validation error, no money moves.
  - Both present and valid → the normal Send Money result.

## 3. Scope
- **In scope:**
  - Send Money requests with no sender account or no receiver account.
  - The service staying available after such a request.
- **Out of scope:**
  - Accounts sent in the wrong type, such as a list (SM-L03).
  - Accounts that are present but unknown (BRD already requires a 404).
  - The same defect in Deposit, Withdraw, Payment and Admin Deposit (CASHIN-H01, tracked separately).
  - The Send Money web page. It always sends both accounts, so it cannot trigger this bug.

## 4. System Impact
| Area | Impact | Note |
|---|---|---|
| API: Send Money | Direct | Request validation and error response |
| Service availability (whole API) | Direct | Today one bad request stops the service for every user and every feature |
| DB: Users, Transactions | Indirect | The lookup must not run with an empty value, and no ledger rows may be written |
| UI: Send Money page | None | Always sends both fields |
| Roles | Indirect | Any logged-in role can trigger the crash, because it happens before the role check |

## 5. Risks
- **Functional:** clients get no response (the connection drops) instead of a clear validation error.
- **Data:** low. The crash happens before any write, but in-flight requests from other users are cut off mid-way.
- **Security:** high. Any logged-in user can take the whole platform down with one request (denial of service).
- **Performance:** every crash means a restart, and every user is affected until the service comes back.

## 6. Gaps
- **Missing requirement:**
  - BRD §15 gives no error message for "account not provided". Only the 400 status is implied ("invalid … / validation error").
  - The exact message wording is unspecified.
- **Missing requirement:** no BRD rule says that one failed request must not affect other users (service availability). It is an obvious expectation, but it isn't written down.
- **Assumption:** an empty or whitespace-only account counts as "missing". The BRD doesn't say this.
- **Question:** should the response say *which* account is missing, so the client can fix the right field?

## 7. Edge Cases
- Sender account missing while the receiver account is valid.
- Receiver account missing while the sender account is valid.
- Both accounts missing.
- An account sent as an empty string or only spaces.
- An account sent as `null`.

## 8. Acceptance Criteria
- AC-1 — A Send Money request without a sender account is rejected as a bad request (HTTP 400).
- AC-2 — A Send Money request without a receiver account is rejected as a bad request (HTTP 400).
- AC-3 — After a request rejected under AC-1 or AC-2, the service still answers its health check normally.
- AC-4 — After a request rejected under AC-1 or AC-2, other users' requests keep being served without interruption.
- AC-5 — A rejected request moves no money: the sender's and receiver's balances are unchanged, and no new statement entry appears.
