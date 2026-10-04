# Send Money Bugs

## Section 1: List of Bugs

### High Priority

#### SM-H01
- **Bug Id:** SM-H01
- **Bug Title:** [Send Money] A request without from_account or to_account crashes the whole API process
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible - the Send Money page always sends both `from_account` (from localStorage) and `to_account`, and blocks an empty receiver.
  2. [API] Log in as Customer 2 (`salmansrabon+customer2@gmail.com`, dev OTP bypass) and keep the JWT.
  3. [API] `GET /` and check it returns `{"message":"Server is up"}`.
  4. [API] `POST /transaction/sendmoney` with `Authorization: Bearer <JWT>`, `X-AUTH-SECRET-KEY` and body `{"to_account":"01686606902","amount":20}` (no `from_account`).
  5. [API] `GET /` again.
  6. [API] Restart the server, then `POST /transaction/sendmoney` with body `{"from_account":"01686606903","amount":20}` (no `to_account`).
  7. [API] `GET /` again.
- **Expected result:** Both requests are rejected with a validation error (HTTP 400), because both accounts must exist (BRD §7.3, precondition 1). The server keeps running and `GET /` still returns `{"message":"Server is up"}`.
- **Actual result:** Steps 4 and 6 both end with curl error 52 "Empty reply from server". Steps 5 and 7: connection refused, because the Node process exited. The server log shows `WHERE parameter "phone_number" has invalid "undefined" value` and then `Node.js v26.8.1`. Code trace: `sendMoney.controller.js` lines 25-26 call `Users.findOne({ where: { phone_number: from_account | to_account } })` before any presence check and outside any try/catch. Route `transaction.route.js:21` has no async wrapper (Express 4), and the API has no `unhandledRejection` handler. A standalone script calling `Users.findOne({ where: { phone_number: undefined } })` rejects with the same message. The crash happens before the role check, so any authenticated role can trigger it. Related: CASHIN-H01 (same pattern in Deposit; that report noted it "likely exists in sendMoney; not tested").

#### SM-H02
- **Bug Id:** SM-H02
- **Bug Title:** [Send Money] Concurrent send-money requests exceed the daily transaction-count limit
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible - it needs parallel requests, and the form disables the button while a request is in flight.
  2. [API] Log in as Customer 1 (`salmansrabon+customer1@gmail.com`).
  3. [API] Confirm the starting usage: Customer 1 had 6 outgoing transactions today (UTC), all SendMoney. This is 18 after the run minus the 12 sends that succeeded. A read-only SQL count confirmed 18 rows afterwards: `SELECT COUNT(DISTINCT trnxId) FROM Transactions WHERE account='01686606902' AND debit>0 AND transaction_type IN ('SendMoney','Payment','Withdraw') AND createdAt >= '2026-10-04 00:00:00'` returned 18 (total debit 386.555).
  4. [API] Send 14 parallel requests: `for i in $(seq 1 14); do (curl -sS -o r$i.out -w "%{http_code}\n" -X POST http://localhost:5000/transaction/sendmoney -H "Authorization: Bearer $T1" -H "X-AUTH-SECRET-KEY: ROADTOSDET" -H "Content-Type: application/json" -d '{"from_account":"01686606902","to_account":"01686606903","amount":10}' > c$i.code) & done; wait`
  5. [API] Send one more `POST /transaction/sendmoney` with the same body.
- **Expected result:** At most 10 outgoing transactions per day (BRD §8.1, §8.3). With 6 already used, only 4 more succeed and the rest are rejected with the daily-limit error.
- **Actual result:** 12 of the 14 requests returned 201. The other 2 returned 400 `{"message":"Daily transaction limit reached. You have used all 10 allowed transactions for this daily period.","details":{"period":"daily","usedAmount":296.555,"usedCount":12,"maxAmount":5000,"maxCount":10,"remainingAmount":4703.445,"remainingCount":0}}`. Step 5 returned the same message with `usedCount` 18 against `maxCount` 10, and SQL confirms 18 SendMoney transactions today. Code trace: `sendMoney.controller.js:61` calls `checkCustomerLimits` before and outside the `sequelize.transaction` opened at line 79. The `FOR UPDATE` at line 84 locks only the balance read, and `limitChecker.getUsage` reads without a lock. The same unlocked check applies to the daily amount limit (5,000 Tk); that was not tested. Earlier code-only prediction: `.artifacts/transaction-limits.report.md` G-1, confirmed here live.

### Medium Priority

#### SM-M01
- **Bug Id:** SM-M01
- **Bug Title:** [Send Money] Sending to own account with a trailing space in the receiver number is accepted
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Log in as Customer 2 on `/login?env=dev` (dev OTP bypass).
  2. [API] `GET /transaction/balance/01686606903` (before: 9,246.06).
  3. [UI] Open `/customer/send-money`. Enter receiver `01686606903 ` (own number plus one trailing space) and amount `20`, then click Send Money.
  4. [API] `GET /transaction/balance/01686606903` (after).
  5. [API] Same defect through the API as Customer 1 (balance before 7,468.94): `POST /transaction/sendmoney` with body `{"from_account":"01686606902","to_account":"01686606902 ","amount":20}`, then `GET /transaction/balance/01686606902`.
- **Expected result:** Rejected with "From account and to account cannot be the same", because the two accounts must be different (BRD §7.3 precondition 2, §14).
- **Actual result:** The UI shows "Send money successful", transaction ID TXNCL2X0F6KHR, service fee 5.00. Balance went 9,246.06 → 9,241.06 (only the 5 fee was lost). The API call returned 201 (trnxId TXNDP3YKNOV6L), and the balance went 7,468.94 → 7,463.94. The statement for 01686606903 shows the credit row with account `'01686606903 '` (trailing space, credit 20) and the debit row with account `'01686606903'` (debit 25). Code trace: `sendMoney.controller.js:41` compares `from_account === to_account` as raw strings, and `send-money/page.tsx` sends the receiver untrimmed. The database collation is `utf8mb4_unicode_ci` (PAD SPACE; `sql_scripts/local-dmoneydb-202604201925.sql` L155 for `Users.phone_number`, L119 for `Transactions.account`), so the user lookup and balance queries treat `'01686606903 '` as the same account.

#### SM-M02
- **Bug Id:** SM-M02
- **Bug Title:** [Send Money] Amounts with more than two decimal places are accepted and stored unrounded
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Log in as Customer 2 and open `/customer/send-money`.
  2. [UI] Enter receiver `01686606902` and amount `10.555`, then click Send Money.
  3. [UI] Read the receipt.
  4. [API] `GET /transaction/statement/01686606903?count=3`.
- **Expected result:** The receipt amount matches the amount debited and credited, and the amount follows the form's own 0.01 step, so a 3-decimal amount is rejected. Basis: the amount field declares `step 0.01` and BDT has two decimals. The BRD has no explicit decimal rule, so this expectation is implied.
- **Actual result:** The send succeeds. The receipt shows Total Amount 10.55 and Service Fee 5.00, but the sender's debit row is 15.555 and the credit to the receiver is 10.555. Code trace: `sendMoney.controller.js:12` uses `Number(amount)` with no scale check, `Transactions.debit` and `credit` are DOUBLE, and the form's `noValidate` defeats `step 0.01`. `(10.555).toFixed(2)` renders "10.55". Related: CASHIN-M03 (the same defect in Deposit).

### Low Priority

#### SM-L01
- **Bug Id:** SM-L01
- **Bug Title:** [Send Money] Non-numeric amount forms such as "0x10", "1e1" and [20] are accepted as valid amounts
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible - the amount field is `type=number`.
  2. [API] Log in as Customer 1.
  3. [API] `POST /transaction/sendmoney` with body `{"from_account":"01686606902","to_account":"01686606903","amount":"0x10"}` (amount is a JSON string).
  4. [API] Same body with `"amount":"1e1"` (JSON string).
  5. [API] Same body with `"amount":[20]` (JSON array).
- **Expected result:** Each request is rejected with HTTP 400 `Amount must be a valid number greater than 0` (BRD §15 lists an invalid amount as a 400 case).
- **Actual result:** `"0x10"` → 201, sender debited 21 (16 + 5). `"1e1"` → 201, sender debited 15 (10 + 5). `[20]` → 201, sender debited 25 (20 + 5). Code trace: `sendMoney.controller.js` lines 12 and 15: `Number("0x10")` is 16, `Number("1e1")` is 10 and `Number([20])` is 20, and all pass `Number.isFinite`.

#### SM-L02
- **Bug Id:** SM-L02
- **Bug Title:** [Send Money] Receipt "Total Amount" excludes the service fee that was debited
- **Confidence:** Low
- **Step to reproduce:**
  1. [UI] Log in as Customer 2 and open `/customer/send-money`.
  2. [UI] Enter receiver `01686606902` and amount `20`, then click Send Money.
  3. [UI] Read the receipt.
  4. [API] `GET /transaction/statement/01686606903?count=2` for the sender's debit row.
- **Expected result:** The receipt's "Total Amount" shows what was debited from the sender (20 + 5 fee = 25), consistent with BRD §7.3, where the sender is debited amount + 5.
- **Actual result:** The receipt (transaction TXNDMXJYH1Y8Y) shows Total Amount ৳20.00 and Service Fee ৳5.00. The sender's debit row for that transaction is 25. Code trace: `send-money/page.tsx` lines 181-182 render the typed amount under the label "Total Amount". The same label appears on four other receipt pages (agent cash-in, agent payment, customer cash-out, customer payment). No requirement defines the label, so confidence is Low.

#### SM-L03
- **Bug Id:** SM-L03
- **Bug Title:** [Send Money] A non-string receiver value makes the request fail with HTTP 500 and the raw internal validation message
- **Confidence:** Low
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible - the page always sends the receiver as a string.
  2. [API] Precondition: the sender has fewer than 10 outgoing transactions in the current UTC day (BRD §8.1; the daily limit check runs before the write), a balance of at least 25 BDT, and Customer 2 is active. Customer 1 is over the daily count on 2026-10-04 UTC (18 of 10, from SM-H02), so run this on a later UTC day or use a Customer with quota left.
  3. [API] Log in as the sender (Customer 1 on a later day) with the dev OTP bypass.
  4. [API] `POST /transaction/sendmoney` with `Authorization: Bearer <JWT>`, `X-AUTH-SECRET-KEY` and body `{"from_account":"01686606902","to_account":["01686606903"],"amount":20}`.
- **Expected result:** BRD §15: "400 Bad Request — Validation / business rule error", with no internal detail and no ledger change.
- **Actual result:** Not executed (code trace only). (1) `sendMoney.controller.js:26` runs `Users.findOne({ where: { phone_number: ["01686606903"] } })`; Sequelize turns the array into an `IN (...)` lookup and finds Customer 2. (2) Line 41 compares `from_account === to_account` (string vs array, false), and the role, status, limit, minimum and balance checks all pass. (3) Line 128 (the first create, `debitTrnx`, which carries `to_account`) fails Sequelize instance validation before any INSERT (`instance-validator.js` L196-198). (4) The managed transaction rolls back, so no ledger rows are written. (5) The catch at line 141 is not `INSUFFICIENT_BALANCE`, so line 149 returns HTTP 500 `{"message":"Internal server error","error": ...}`. The expected leaked text is `string violation: to_account cannot be an array or an object`. A database deadlock (CASHIN-M01, executed for Deposit) is a second path to the same 500 response. Related: CASHIN-M04 (adminDeposit returns a 500 with the raw database error, same catch pattern); CASHIN-L01 (Stripe variant).

## Section 2: Summary

| Priority | Count | High conf. | Medium conf. | Low conf. |
|---|---|---|---|---|
| High | 2 | 2 | 0 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 3 | 1 | 0 | 2 |

| Bug Id | Title | Priority | Confidence | Reproduced via |
|---|---|---|---|---|
| SM-H01 | Missing from_account or to_account crashes the whole API process | High | High | API (executed; UI not reproducible) |
| SM-H02 | Concurrent requests exceed the daily transaction-count limit | High | High | API (executed) + SQL |
| SM-M01 | Own-account send accepted with a trailing space in the receiver number | Medium | High | UI + API (executed) |
| SM-M02 | More than 2 decimals accepted and stored unrounded | Medium | Medium | UI + API (executed) |
| SM-L01 | Non-numeric amount forms accepted ("0x10", "1e1", [20]) | Low | High | API (executed; UI not reproducible) |
| SM-L02 | Receipt "Total Amount" excludes the service fee | Low | Low | UI + API (executed) |
| SM-L03 | Non-string receiver value returns HTTP 500 with the raw internal validation message | Low | Low | Code (not executed) |

- **Scope covered:** `POST /transaction/sendmoney` (`controllers/transactions/sendMoney.controller.js`, `services/limitChecker.js`, `sequelizeModel/Transactions.js`, `Commission.getConfig`), the `/customer/send-money` page, BRD §7.3, §8, §9, §14, §15.
- **Tools used:** Serena (symbol and pattern traces of the controller, limit checker, models and page; checked the same unguarded lookup in payment, deposit, withdraw and adminDeposit). graphify (graph built 2026-10-04 01:46; the latest commit is newer, but HEAD `022e0a9` changes no application code, so the graph is current for these files). `/blast-radius`: no application-code changes vs `main` (HEAD equals merge-base), so the impact was traced manually from route → controller → limit service → frontend page. agent-browser (UI reproduction used for SM-M01, SM-M02, SM-L02). `qa-reviewer-agent` adversarial review: first pass BLOCKED (6 flagged, 0 rejected), second pass PASS with all six approved. A later code-trace-only pass reviewed five more candidates: SM-L03 was approved (after two rounds of fixes) and four were rejected (see limitations).
- **Already known (re-confirmed, not re-listed):** none re-confirmed as-is. Related to CASHIN-H01, CASHIN-M03 (this report adds the Send Money instances) and `.artifacts/transaction-limits.report.md` G-1 (predicted from code, confirmed live by SM-H02).
- **Not verified / limitations:**
  - The same unguarded `Users.findOne` crash likely affects `payment`, `deposit`, `withdraw` and `adminDeposit` (same lines in those controllers); not tested here.
  - The daily **amount** limit (5,000 Tk) likely has the same race as SM-H02; not tested.
  - Account-number enumeration through `from_account` (404 before the ownership check), and the missing client-side phone-format and minimum-amount checks on the page, were seen in code only and are not filed.
  - SM-L03 is a code trace only and was not executed; it needs a sender with daily quota left.
  - Candidates reviewed and rejected, not filed: the receiver's wallet cap is not checked on Send Money (BRD §8.5 and §9 apply the cap to Deposit and Stripe only); the 404 for an unknown receiver (required by BRD §7.3 and §15); the `currentBalance` in the response under overlapping sends (accurate at response time, no requirement); no client-side phone or minimum-amount check on the page (the server enforces both).
  - **Open requirement question:** should the 10,000 BDT wallet cap also apply to Send Money credits? BRD §8.5 lists it for Deposit and Stripe only.
  - Stripe is irrelevant to this module.
  - **Test data left in the local DB:** Customer 1 (`01686606902`) used its daily send-money allowance (18 SendMoney transactions today). Customers 1 and 2 have extra ledger rows from these sends, including the trailing-space credit row `'01686606903 '`. The API process was crashed and restarted twice for SM-H01.
