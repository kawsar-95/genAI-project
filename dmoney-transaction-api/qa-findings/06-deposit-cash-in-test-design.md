# Test Design — Cash-In / Deposit

**Scope:** `POST /transaction/deposit` (SYSTEM→Agent, Agent→Customer), `POST /transaction/adminDeposit` (Admin→SYSTEM), `POST /transaction/stripe/create-intent`, `POST /transaction/stripe/confirm`
**Regime:** Implementation available — cases traced from source code, no ticket.
**Totals:** 64 cases — High 25 · Mid 29 · Low 10
**Related docs:** known bugs in [02-deposit-bugs.md](02-deposit-bugs.md); earlier cases in [03-deposit-test-cases.md](03-deposit-test-cases.md); charters in [05-deposit-test-charters.md](05-deposit-test-charters.md)

---

## 1. Requirement Highlights

- **R-1:** All four endpoints need `Authorization: Bearer <JWT>` **and** `X-AUTH-SECRET-KEY` = `PARTNER_KEY`. Missing token / wrong key → 401; expired / invalid token → 403. — _routes/transaction.route.js:19-25, jwtMiddleware.js:7-33_
- **R-2:** Deposit amount must be a finite number > 0. — _deposit.controller.js:29-31_
- **R-3:** The token owner must own `from_account` (phone or email, case-insensitive match). — _deposit.controller.js:47-56_
- **R-4:** `from_account` and `to_account` must be different. — _deposit.controller.js:58-60_
- **R-5:** Both accounts must have `status = active` (other values: `pending`, `suspended`). — _deposit.controller.js:63-68, Users.js:31-35_
- **R-6:** Only Agent-role accounts can start a deposit. SYSTEM is an Agent with `phone_number = 'SYSTEM'`. — _deposit.controller.js:71-78, Users.js:71-76_
- **R-7:** **Flow 1 (SYSTEM → Agent):** the receiver must be a regular Agent. No commission, no min/max limits. The SYSTEM balance must cover the amount. — _deposit.controller.js:85-112_
- **R-8:** **Flow 2 (Agent → Customer):** the receiver must be a Customer. — _deposit.controller.js:164-168_
- **R-9:** Flow 2 amount must be in the range 10–10,000 tk. Limits come from the `Commissions` table (Deposit rules), with fallback defaults 10 / 10000. — _deposit.controller.js:34-37, 173-177; Commission.js:125-161_
- **R-10:** Flow 2 commission = 2.5% of the amount (fallback rate 0.025), credited back on the agent's ledger row. The customer receives the full amount. — _deposit.controller.js:35, 170, 219-238_
- **R-11:** The agent's balance must cover the full amount, and must be > 0. — _deposit.controller.js:195-199_
- **R-12:** Customer wallet cap is 10,000 tk (`maxTxnAmount`). A deposit cannot push the balance over the cap. — _deposit.controller.js:208-217_
- **R-13:** Each deposit writes exactly 2 ledger rows sharing one `trnxId` (`TXN` + 10 uppercase alphanumerics), `transaction_type = 'Deposit'`. The balance check and the writes run in one DB transaction with `FOR UPDATE` locks. — _deposit.controller.js:98-137, 185-243; generateTrnxId.js_
- **R-14:** Admin deposit: the token owner must own `from_account` and have role Admin. The receiver must be `SYSTEM`. Amount must be > 0. No balance check, no limits. Writes are atomic. — _adminDeposit.controller.js:21-83_
- **R-15:** Stripe create-intent: only active Customers. Amount must be > 0 and within 10–10,000 tk. Amount must fit the remaining wallet cap. The PaymentIntent is created in paisa (`amount × 100`), currency `bdt`, with `metadata.customer_phone`. — _stripeCashIn.controller.js:44-97_
- **R-16:** Stripe confirm: `paymentIntentId` is required. The PaymentIntent must have status `succeeded`, belong to the caller (`metadata.customer_phone`), and not have been processed before. On success it debits SYSTEM, credits the customer, and sets `trnxId` = PaymentIntent id and `from_account = 'STRIPE'`. — _stripeCashIn.controller.js:129-201_
- **R-17:** Allowed `transaction_type` values: `Deposit`, `StripeCashIn`, `AdminDeposit` (plus others). — _Transactions.js:35-39_
- **Roles:** SYSTEM → Agent · Agent → Customer · Admin → SYSTEM · Customer → own wallet via Stripe. Merchant cannot cash in.
- **Test setup:**
  - Base URL `http://localhost:5000`. **H** = headers `Authorization: Bearer <token>`, `X-AUTH-SECRET-KEY: ROADTOSDET`, `Content-Type: application/json`.
  - Tokens:
    - Agent **A** `01686606901`, Customer **C1** `01686606902`, Customer **C2** `01686606903`: `POST /user/login` `{"email":"<email>","password":"1234"}`, then `POST /user/verify-otp` `{"identifier":"<email>","otp":"<console OTP>"}`.
    - **SYSTEM**: login with `{"phone_number":"SYSTEM","password":"1234"}`.
    - **Admin** `01686606909`: login with `{"email":"admin@dmoney.com","password":"1234"}`.
  - Fixtures (Admin `POST /user/create`, then `PATCH /user/update/:id` `{"status":"active"}`):
    - Agent **A0** `01700000001`, zero balance.
    - Customer **CF** `01700000002`, zero balance.
    - Merchant **M** `01686606905` (seeded).
  - Set exact balances by funding through Flow 1 / Flow 2.
  - Checks: balance → `GET /transaction/balance/<phone>`; ledger → `SELECT * FROM Transactions WHERE trnxId='<id>'`.
- **Out of scope:**
  - Login/OTP flow itself.
  - Withdraw, send money, payment.
  - Frontend UI.
  - Security findings already in `04-security-vulnerabilities.md`, except where they overlap deposit authorization.

---

## 2. Test Cases

### A. Agent → Customer deposit (`POST /transaction/deposit`)

### TC-001: Verify agent deposit to customer with valid amount
**Test Steps:**
1. Log in as A. Record A's balance `BA` and C1's balance `BC` (C1 has `BC` ≤ 9500).
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01686606902","amount":500}`.
3. Re-read both balances.

**Expected Result:**
- HTTP 201, `message: "Deposit successful"`, `trnxId` matches `^TXN[A-Z0-9]{10}$`, `commission: 12.5`.
- `currentBalance` = `BA − 487.5`, and equals A's new balance.
- C1's balance = `BC + 500`.

### TC-002: Verify ledger rows of an agent-to-customer deposit
**Test Steps:**
1. Run TC-001 and capture `trnxId`.
2. `SELECT account, debit, credit, description, transaction_type FROM Transactions WHERE trnxId='<trnxId>'`.

**Expected Result:**
- Exactly 2 rows.
- Agent row: `account=01686606901`, `debit=500`, `credit=12.5`, `description="Deposit Commission"`, `transaction_type="Deposit"`.
- Customer row: `account=01686606902`, `debit=0`, `credit=500`, `description="Deposit"`, `transaction_type="Deposit"`.

### TC-003: Verify agent deposit with amount at minimum limit
**Test Steps:**
1. Log in as A. C1's balance ≤ 9990.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01686606902","amount":10}`.

**Expected Result:**
- HTTP 201, `message: "Deposit successful"`, `commission: 0.25`.
- C1's balance increases by exactly 10.

### TC-004: Verify agent deposit with amount below minimum limit
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01686606902","amount":9.99}`.

**Expected Result:**
- HTTP 400, `message: "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"`.
- No ledger rows written. A and C1 balances unchanged.

### TC-005: Verify agent deposit with amount at maximum limit
**Test Steps:**
1. Log in as A. CF's balance = 0. A's balance ≥ 10000.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01700000002","amount":10000}`.

**Expected Result:**
- HTTP 201, `commission: 250`.
- CF's balance = 10000.

### TC-006: Verify agent deposit with amount above maximum limit
**Test Steps:**
1. Log in as A. CF's balance = 0.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01700000002","amount":10000.01}`.

**Expected Result:**
- HTTP 400, `message: "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"`.
- No ledger rows written.

### TC-007: Verify agent deposit filling customer wallet exactly to cap
**Test Steps:**
1. Bring CF's balance to exactly 9500 (agent deposit of 9500).
2. As A, `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01700000002","amount":500}`.

**Expected Result:**
- HTTP 201, `message: "Deposit successful"`.
- CF's balance = 10000.00.

### TC-008: Verify agent deposit exceeding customer's remaining wallet limit
**Test Steps:**
1. Bring CF's balance to exactly 9500.
2. As A, `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01700000002","amount":501}`.

**Expected Result:**
- HTTP 208, `message: "Limit exceeded. You can deposit a maximum of 500.00 tk to this customer."`.
- No ledger rows written. CF stays at 9500.

### TC-009: Verify agent deposit to customer wallet already at cap
**Test Steps:**
1. Bring CF's balance to exactly 10000.
2. As A, `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01700000002","amount":10}`.

**Expected Result:**
- HTTP 208, `message: "Limit exceeded. You cannot deposit any more to this account."`.
- No ledger rows written.

### TC-010: Verify agent deposit with amount exceeding agent balance
**Test Steps:**
1. Log in as A0. Set up two data rows:
   - (a) A0 balance = 0, request `amount=100`.
   - (b) A0 balance = 100 (SYSTEM → A0), request `amount=500`.
2. `POST /transaction/deposit` with H, body `{"from_account":"01700000001","to_account":"01686606902","amount":<amount>}`.

**Expected Result:**
- HTTP 208, `message: "Insufficient balance"`, `currentBalance` = 0 for (a) and 100 for (b).
- No ledger rows written. A0 balance unchanged.

### TC-011: Verify agent deposit with amount equal to agent balance
**Test Steps:**
1. Fund A0 with exactly 500 (SYSTEM → A0). Log in as A0.
2. `POST /transaction/deposit` with H, body `{"from_account":"01700000001","to_account":"01686606902","amount":500}`.

**Expected Result:**
- HTTP 201, `commission: 12.5`.
- A0's balance = 12.5.

### TC-012: Verify agent deposit to non-customer accounts
**Test Steps:**
1. Log in as A. Fund A0 if needed.
2. `POST /transaction/deposit` with H, `from_account: "01686606901"`, `amount: 500`, and `to_account` in each of: `01700000001` (Agent), `01686606905` (Merchant), `SYSTEM`, `01686606909` (Admin).

**Expected Result:**
- Each request returns HTTP 400, `message: "To account must be a Customer account. A regular Agent can only deposit to a Customer."`.
- No ledger rows written.

### TC-013: Verify deposit with same from and to account
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01686606901","amount":500}`.

**Expected Result:**
- HTTP 400, `message: "From account and to account cannot be the same"`.
- No ledger rows written.

### TC-014: Verify deposit with invalid amount values
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, `from_account: "01686606901"`, `to_account: "01686606902"`, and `amount` in each of: `0`, `-100`, `"abc"`, `null`, `""`, field omitted.

**Expected Result:**
- Each request returns HTTP 400, `message: "Amount must be a valid number greater than 0"`.
- No ledger rows written.

### TC-015: Verify deposit with numeric string amount
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01686606902","amount":"500"}`.

**Expected Result:**
- HTTP 201, `commission: 12.5`.
- Customer ledger row `credit = 500` (a number, not the string).

### TC-016: Verify deposit with amount having more than two decimals
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01686606902","amount":100.555}`.

**Expected Result:**
- TBD — see Q-2 (rounding rule for amount and commission).
- Whatever the rule, the response `commission` must equal the ledger `credit` on the agent row.

### TC-017: Verify deposit with non-existent to_account
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01799999999","amount":500}`.

**Expected Result:**
- HTTP 404, `message: "To Account does not exist"`.
- No ledger rows written.

### TC-018: Verify deposit with non-existent from_account
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"01799999999","to_account":"01686606902","amount":500}`.

**Expected Result:**
- HTTP 404, `message: "From Account does not exist"`.
- No ledger rows written.

### TC-019: Verify deposit with missing account fields
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H and each body:
   - `{"to_account":"01686606902","amount":500}`
   - `{"from_account":"01686606901","amount":500}`
   - `{}`

**Expected Result:**
- Each request returns a 4xx validation error within 5 s (no hang, no 5xx). Message TBD — see Q-1.
- No ledger rows written.

### TC-020: Verify deposit to inactive customer accounts
**Test Steps:**
1. As Admin, set CF's status to `suspended` (`PATCH /user/update/<CF id>` `{"status":"suspended"}`). Repeat the test later with `pending`.
2. As A, `POST /transaction/deposit` with H, body `{"from_account":"01686606901","to_account":"01700000002","amount":500}`.

**Expected Result:**
- HTTP 403, `message: "To account is not active. Please contact admin."` for both statuses.
- No ledger rows written.

### TC-021: Verify deposit from suspended agent
**Test Steps:**
1. Log in as A0 (fund it with 1000 first). Keep the token.
2. As Admin, set A0's status to `suspended`.
3. With A0's token, `POST /transaction/deposit` with H, body `{"from_account":"01700000001","to_account":"01686606902","amount":500}`.

**Expected Result:**
- HTTP 403, `message: "From account is not active. Please contact admin."`.
- No ledger rows written. A0 balance unchanged.

### TC-022: Verify deposit with from_account of another agent
**Test Steps:**
1. Fund A0 with 1000. Log in as A.
2. `POST /transaction/deposit` with A's token, body `{"from_account":"01700000001","to_account":"01686606902","amount":500}`.

**Expected Result:**
- HTTP 403, `message: "Unauthorized: you can only initiate transactions from your own account"`.
- No ledger rows written. A0 balance unchanged.

### TC-023: Verify deposit with agent token and SYSTEM as from_account
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with H, body `{"from_account":"SYSTEM","to_account":"01700000001","amount":500}`.

**Expected Result:**
- HTTP 403, `message: "Unauthorized: you can only initiate transactions from your own account"`.
- SYSTEM balance unchanged.

### TC-024: Verify deposit initiated with customer token
**Test Steps:**
1. Log in as C1.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606902","to_account":"01686606903","amount":500}`.

**Expected Result:**
- HTTP 400, `message: "Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit."`.
- No ledger rows written.

### TC-025: Verify deposit initiated with merchant token
**Test Steps:**
1. Log in as M.
2. `POST /transaction/deposit` with H, body `{"from_account":"01686606905","to_account":"01686606902","amount":500}`.

**Expected Result:**
- HTTP 400, `message: "Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit."`.

### TC-026: Verify deposit without authorization token
**Test Steps:**
1. `POST /transaction/deposit` with only `X-AUTH-SECRET-KEY: ROADTOSDET`, body `{"from_account":"01686606901","to_account":"01686606902","amount":500}`.

**Expected Result:**
- HTTP 401, `message: "No Token Found!"`.
- No ledger rows written.

### TC-027: Verify deposit with wrong partner secret key
**Test Steps:**
1. Log in as A.
2. `POST /transaction/deposit` with a valid Bearer token, `X-AUTH-SECRET-KEY: WRONGKEY`, and the TC-001 body.
3. Repeat with the header omitted.

**Expected Result:**
- HTTP 401, `message: "Secret auth key validation failure!"` in both cases.

### TC-028: Verify deposit with expired token
**Test Steps:**
1. Get an Agent A token older than `expires_in` (1 h), or sign one with `exp` in the past using `ACCESS_TOKEN_SECRET`.
2. `POST /transaction/deposit` with that token and the TC-001 body.

**Expected Result:**
- HTTP 403, `message: "Token expired!"`.

### TC-029: Verify deposit with tampered token
**Test Steps:**
1. Take a valid A token and change one character of its signature segment.
2. `POST /transaction/deposit` with that token and the TC-001 body.

**Expected Result:**
- HTTP 403, `message: "Token invalid!"`.

### TC-030: Verify concurrent deposits exceeding agent balance
**Test Steps:**
1. Fund A0 with exactly 600. Log in as A0.
2. Send 2 parallel `POST /transaction/deposit` requests, each with body `{"from_account":"01700000001","to_account":"01686606902","amount":500}`.

**Expected Result:**
- Exactly one HTTP 201 and one HTTP 208 `"Insufficient balance"`.
- A0 balance = 112.5 (never negative).
- Exactly 2 new ledger rows (one `trnxId`).

### TC-031: Verify concurrent deposits from two agents exceeding customer cap
**Test Steps:**
1. Bring CF's balance to exactly 9000. Fund A0 with 1000.
2. In parallel:
   - A deposits `{"from_account":"01686606901","to_account":"01700000002","amount":800}`
   - A0 deposits `{"from_account":"01700000001","to_account":"01700000002","amount":800}`

**Expected Result:**
- Exactly one HTTP 201. The other returns HTTP 208 `"Limit exceeded. You can deposit a maximum of 200.00 tk to this customer."`.
- CF's balance = 9800 (≤ 10000).

### TC-032: Verify deposit commission with updated rate in Commissions table
**Test Steps:**
1. `UPDATE Commissions SET rate=0.03 WHERE transaction_type='Deposit' AND recipient='Agent' AND is_active=1`.
2. As A, deposit `{"from_account":"01686606901","to_account":"01686606902","amount":1000}`.
3. Restore `rate=0.025`.

**Expected Result:**
- HTTP 201, `commission: 30`.
- Agent ledger row `credit = 30`.

### TC-033: Verify deposit limits with updated min amount in Commissions table
**Test Steps:**
1. `UPDATE Commissions SET min_txn_amount=50 WHERE transaction_type='Deposit' AND is_active=1`.
2. As A, deposit `amount: 40`, then `amount: 50` (to C1).
3. Restore `min_txn_amount=10`.

**Expected Result:**
- `amount: 40` → HTTP 400, `message: "Minimum deposit amount is 50 tk and maximum deposit amount is 10000 tk"`.
- `amount: 50` → HTTP 201.

### TC-034: Verify deposit with no active Deposit commission rules
**Test Steps:**
1. `UPDATE Commissions SET is_active=0 WHERE transaction_type='Deposit'`.
2. As A, deposit `{"from_account":"01686606901","to_account":"01686606902","amount":1000}`, then `amount: 9.99`.
3. Restore `is_active=1`.

**Expected Result:**
- `amount: 1000` → HTTP 201, `commission: 25` (fallback 2.5%).
- `amount: 9.99` → HTTP 400 with the min 10 / max 10000 message (fallback limits).

### TC-035: Verify deposit when a ledger write fails mid-transaction
**Test Steps:**
1. Create a DB trigger:
   `CREATE TRIGGER t_fail BEFORE INSERT ON Transactions FOR EACH ROW BEGIN IF NEW.description='Deposit' THEN SIGNAL SQLSTATE '45000'; END IF; END`.
2. As A, deposit the TC-001 body. Record A's balance before and after.
3. `DROP TRIGGER t_fail`.

**Expected Result:**
- HTTP 500, `message: "Internal server error"`.
- Zero rows with the generated `trnxId`. Agent "Deposit Commission" row not persisted. A's balance unchanged.

### B. SYSTEM → Agent deposit (`POST /transaction/deposit`)

### TC-036: Verify SYSTEM deposit to regular agent
**Test Steps:**
1. Log in as SYSTEM. Record A0's balance `B0` and SYSTEM's balance `S`.
2. `POST /transaction/deposit` with H, body `{"from_account":"SYSTEM","to_account":"01700000001","amount":5000}`.
3. Query the ledger by the returned `trnxId`.

**Expected Result:**
- HTTP 201, `message: "SYSTEM deposit to Agent successful"`, `amount: 5000`, `agentBalance: B0 + 5000`.
- 2 rows, `transaction_type="Deposit"`:
  - SYSTEM `debit=5000`, `description="System Deposit to Agent"`.
  - A0 `credit=5000`, `description="Top-up from SYSTEM"`.
- No commission. SYSTEM balance = `S − 5000`.

### TC-037: Verify SYSTEM deposit to agent above per-transaction maximum
**Test Steps:**
1. Log in as SYSTEM.
2. `POST /transaction/deposit` with H, body `{"from_account":"SYSTEM","to_account":"01700000001","amount":15000}`.
3. Repeat with `amount: 1`.

**Expected Result:**
- Both requests return HTTP 201 (no min/max for Flow 1).
- A0's balance increases by 15000, then by 1.

### TC-038: Verify SYSTEM deposit to non-agent accounts
**Test Steps:**
1. Log in as SYSTEM.
2. `POST /transaction/deposit` with H, `from_account: "SYSTEM"`, `amount: 500`, and `to_account` in each of: `01686606902` (Customer), `01686606905` (Merchant), `01686606909` (Admin).

**Expected Result:**
- Each request returns HTTP 400, `message: "SYSTEM account can only deposit to a regular Agent account. Customer and Merchant accounts are not allowed."`.
- No ledger rows written.

### TC-039: Verify SYSTEM deposit to itself
**Test Steps:**
1. Log in as SYSTEM.
2. `POST /transaction/deposit` with H, body `{"from_account":"SYSTEM","to_account":"SYSTEM","amount":500}`.

**Expected Result:**
- HTTP 400, `message: "From account and to account cannot be the same"`.

### TC-040: Verify SYSTEM deposit with amount exceeding SYSTEM balance
**Test Steps:**
1. Log in as SYSTEM. Record SYSTEM's balance `S`.
2. `POST /transaction/deposit` with H, body `{"from_account":"SYSTEM","to_account":"01700000001","amount":<S + 1>}`.

**Expected Result:**
- HTTP 208, `message: "SYSTEM account has insufficient balance"`, `currentBalance: S`.
- No ledger rows written.

### TC-041: Verify SYSTEM deposit with lowercase login identifier
**Test Steps:**
1. Log in with `{"phone_number":"system","password":"1234"}`.
2. `POST /transaction/deposit` with that token, body `{"from_account":"SYSTEM","to_account":"01700000001","amount":100}`.

**Expected Result:**
- HTTP 201, `message: "SYSTEM deposit to Agent successful"`.

### C. Admin → SYSTEM deposit (`POST /transaction/adminDeposit`)

### TC-042: Verify admin deposit to SYSTEM account
**Test Steps:**
1. Log in as Admin. Record SYSTEM's balance `S`.
2. `POST /transaction/adminDeposit` with H, body `{"from_account":"01686606909","to_account":"SYSTEM","amount":100000}`.
3. Query the ledger by the returned `trnxId`.

**Expected Result:**
- HTTP 201, `message: "Deposit to SYSTEM account successful"`, `amount: 100000`, `trnxId` matches `^TXN[A-Z0-9]{10}$`.
- 2 rows:
  - Admin `debit=100000`, `description="Admin Deposit to SYSTEM"`.
  - SYSTEM `credit=100000`, `description="Admin Deposit"`.
- SYSTEM balance = `S + 100000`.

### TC-043: Verify admin deposit to non-SYSTEM account
**Test Steps:**
1. Log in as Admin.
2. `POST /transaction/adminDeposit` with H, body `{"from_account":"01686606909","to_account":"01686606901","amount":1000}`.

**Expected Result:**
- HTTP 400, `message: "Admin can only deposit to the SYSTEM account. Please enter 'SYSTEM' as the account phone number."`.
- No ledger rows written.

### TC-044: Verify admin deposit endpoint with agent token
**Test Steps:**
1. Log in as A.
2. `POST /transaction/adminDeposit` with H, body `{"from_account":"01686606901","to_account":"SYSTEM","amount":1000}`.

**Expected Result:**
- HTTP 403, `message: "Only Admin can use this deposit endpoint"`.
- SYSTEM balance unchanged.

### TC-045: Verify admin deposit with admin from_account using agent token
**Test Steps:**
1. Log in as A.
2. `POST /transaction/adminDeposit` with H, body `{"from_account":"01686606909","to_account":"SYSTEM","amount":1000}`.

**Expected Result:**
- HTTP 403, `message: "Unauthorized: you can only initiate transactions from your own account"`.

### TC-046: Verify admin deposit with invalid amount values
**Test Steps:**
1. Log in as Admin.
2. `POST /transaction/adminDeposit` with H, `from_account: "01686606909"`, `to_account: "SYSTEM"`, and `amount` in each of: `0`, `-1`, `"abc"`, field omitted.

**Expected Result:**
- Each request returns HTTP 400, `message: "Amount must be greater than 0"`.
- No ledger rows written.

### TC-047: Verify admin deposit with uppercase email login identifier
**Test Steps:**
1. Log in with `{"email":"ADMIN@DMONEY.COM","password":"1234"}`.
2. `POST /transaction/adminDeposit` with that token, body `{"from_account":"01686606909","to_account":"SYSTEM","amount":100}`.

**Expected Result:**
- TBD — see Q-4 (`/deposit` matches the identifier case-insensitively; `/adminDeposit` matches it exactly).

### D. Stripe cash-in — create intent (`POST /transaction/stripe/create-intent`)

### TC-048: Verify Stripe payment intent creation by active customer
**Test Steps:**
1. Log in as C1 (balance ≤ 9000).
2. `POST /transaction/stripe/create-intent` with H, body `{"amount":1000}`.
3. Open the PaymentIntent in the Stripe test dashboard.

**Expected Result:**
- HTTP 200 with `clientSecret` (`pi_..._secret_...`), `amount: 1000`, `minAmount: 10`, `maxAmount: 10000`.
- On Stripe: `amount=100000`, `currency=bdt`, `metadata.customer_phone=01686606902`, `metadata.dmoney_amount="1000"`.
- No ledger rows written yet.

### TC-049: Verify Stripe payment intent creation with non-customer tokens
**Test Steps:**
1. Log in as A, then M, then Admin.
2. With each token, `POST /transaction/stripe/create-intent` with H, body `{"amount":1000}`.

**Expected Result:**
- Each request returns HTTP 403, `message: "Only customers can use bank cash-in"`.
- No PaymentIntent created on Stripe.

### TC-050: Verify Stripe payment intent creation by suspended customer
**Test Steps:**
1. Log in as CF. Keep the token. As Admin, set CF's status to `suspended`.
2. With CF's token, `POST /transaction/stripe/create-intent` with H, body `{"amount":1000}`.

**Expected Result:**
- HTTP 403, `message: "Your account is not active. Please contact admin."`.

### TC-051: Verify Stripe payment intent amount boundaries
**Test Steps:**
1. Log in as CF (balance 0).
2. `POST /transaction/stripe/create-intent` with H and `amount` in each of: `9.99`, `10`, `10000`, `10000.01`.

**Expected Result:**
- `9.99` → HTTP 400 `"Minimum cash-in amount is 10 tk"`.
- `10` → HTTP 200.
- `10000` → HTTP 200.
- `10000.01` → HTTP 400 `"Maximum cash-in amount is 10000 tk"`.

### TC-052: Verify Stripe payment intent with invalid amount values
**Test Steps:**
1. Log in as C1.
2. `POST /transaction/stripe/create-intent` with H and `amount` in each of: `0`, `-5`, `"abc"`, field omitted.

**Expected Result:**
- Each request returns HTTP 400, `message: "Amount must be a positive number"`.

### TC-053: Verify Stripe payment intent exceeding remaining wallet limit
**Test Steps:**
1. Bring CF's balance to exactly 9500. Log in as CF.
2. `POST /transaction/stripe/create-intent` with H, body `{"amount":600}`.

**Expected Result:**
- HTTP 208, `message: "Limit exceeded. You can cash in a maximum of 500.00 tk."`.
- No PaymentIntent created on Stripe.

### TC-054: Verify Stripe payment intent with wallet at cap
**Test Steps:**
1. Bring CF's balance to exactly 10000. Log in as CF.
2. `POST /transaction/stripe/create-intent` with H, body `{"amount":10}`.

**Expected Result:**
- HTTP 208, `message: "Limit exceeded. Your wallet is already at maximum capacity."`.

### E. Stripe cash-in — confirm (`POST /transaction/stripe/confirm`)

### TC-055: Verify Stripe cash-in confirmation with succeeded payment
**Test Steps:**
1. As C1, create an intent for `amount: 1000`. Record C1's balance `BC` and SYSTEM's balance `S`.
2. Pay the intent with test card `4242 4242 4242 4242` (any future expiry, any CVC).
3. `POST /transaction/stripe/confirm` with H, body `{"paymentIntentId":"<pi id>"}`.
4. Query the ledger `WHERE trnxId='<pi id>'`.

**Expected Result:**
- HTTP 201, `message: "Cash in successful"`, `trnxId: <pi id>`, `amount: 1000`, `currentBalance: BC + 1000`.
- 2 rows with `from_account="STRIPE"` and `description="Bank Cash In (Stripe)"`:
  - SYSTEM `debit=1000`.
  - C1 `credit=1000`.
- SYSTEM balance = `S − 1000`.

### TC-056: Verify Stripe cash-in confirmation replay with same payment intent
**Test Steps:**
1. Complete TC-055.
2. Call `POST /transaction/stripe/confirm` again with the same `paymentIntentId`.

**Expected Result:**
- HTTP 208, `message: "This payment has already been processed"`.
- Still exactly 2 rows for that `trnxId`. C1's balance unchanged.

### TC-057: Verify concurrent Stripe confirmations of same payment intent
**Test Steps:**
1. As C1, create and pay an intent for `amount: 1000`. Record C1's balance `BC`.
2. Send 5 parallel `POST /transaction/stripe/confirm` requests with the same `paymentIntentId`.

**Expected Result:**
- Exactly one HTTP 201. The rest return HTTP 208 `"This payment has already been processed"`.
- Exactly 2 ledger rows for that `trnxId`. C1's balance = `BC + 1000`.

### TC-058: Verify Stripe cash-in confirmation with unpaid payment intent
**Test Steps:**
1. As C1, create an intent for `amount: 1000`. Do not pay it.
2. `POST /transaction/stripe/confirm` with H, body `{"paymentIntentId":"<pi id>"}`.

**Expected Result:**
- HTTP 400, `message: "Payment not completed. Stripe status: requires_payment_method"`.
- No ledger rows written.

### TC-059: Verify Stripe cash-in confirmation with another customer's payment intent
**Test Steps:**
1. As C1, create and pay an intent for `amount: 1000`.
2. Log in as C2. `POST /transaction/stripe/confirm` with C2's token, body `{"paymentIntentId":"<C1 pi id>"}`.

**Expected Result:**
- HTTP 403, `message: "Payment intent does not belong to this account"`.
- No ledger rows written. C2's balance unchanged.

### TC-060: Verify Stripe cash-in confirmation with missing or unknown payment intent id
**Test Steps:**
1. Log in as C1.
2. `POST /transaction/stripe/confirm` with H and each body: `{}`, `{"paymentIntentId":""}`, `{"paymentIntentId":"pi_doesnotexist123"}`.

**Expected Result:**
- `{}` and `""` → HTTP 400, `message: "paymentIntentId is required"`.
- Unknown id → error response with `message: "Failed to process cash in"` (status code — see Q-6).
- No ledger rows written in any case.

### TC-061: Verify Stripe cash-in confirmation by customer suspended after payment
**Test Steps:**
1. As CF, create and pay an intent for `amount: 1000`. Keep the token.
2. As Admin, set CF's status to `suspended`.
3. With CF's token, `POST /transaction/stripe/confirm` with H, body `{"paymentIntentId":"<pi id>"}`.

**Expected Result:**
- HTTP 403, `message: "Your account is not active. Please contact admin."` (same rule as R-5 / R-15).
- No ledger rows written.

### TC-062: Verify Stripe cash-in confirmation when wallet cap reached after intent
**Test Steps:**
1. Bring CF's balance to 5000. As CF, create and pay an intent for `amount: 5000`.
2. Before confirming, have A deposit 1000 to CF (CF balance = 6000).
3. `POST /transaction/stripe/confirm` with CF's token and the `pi id`.

**Expected Result:**
- TBD — see Q-3.
- The wallet must not silently exceed 10000 unless the business accepts that.

### F. Related regression

### TC-063: Verify ledger transaction types for Stripe and admin deposits
**Test Steps:**
1. Run TC-042 and TC-055.
2. `SELECT trnxId, transaction_type FROM Transactions WHERE trnxId IN ('<admin trnxId>','<pi id>')`.

**Expected Result:**
- Admin deposit rows: `transaction_type = 'AdminDeposit'`.
- Stripe rows: `transaction_type = 'StripeCashIn'` (R-17). Not `NULL`.

### TC-064: Verify customer statement and transaction search after deposit
**Test Steps:**
1. Run TC-001 and capture `trnxId`.
2. As C1, `GET /transaction/statement/01686606902` with H.
3. `GET /transaction/search/<trnxId>` with H.

**Expected Result:**
- The statement's latest entry has the same `trnxId`, `credit=500`, `description="Deposit"`.
- Search returns both ledger rows of that `trnxId` with amounts matching TC-002.

---

## 3. Prioritized Test Titles

### High
- TC-001: Verify agent deposit to customer with valid amount
- TC-002: Verify ledger rows of an agent-to-customer deposit
- TC-036: Verify SYSTEM deposit to regular agent
- TC-042: Verify admin deposit to SYSTEM account
- TC-055: Verify Stripe cash-in confirmation with succeeded payment
- TC-048: Verify Stripe payment intent creation by active customer
- TC-022: Verify deposit with from_account of another agent
- TC-023: Verify deposit with agent token and SYSTEM as from_account
- TC-045: Verify admin deposit with admin from_account using agent token
- TC-059: Verify Stripe cash-in confirmation with another customer's payment intent
- TC-026: Verify deposit without authorization token
- TC-010: Verify agent deposit with amount exceeding agent balance
- TC-008: Verify agent deposit exceeding customer's remaining wallet limit
- TC-009: Verify agent deposit to customer wallet already at cap
- TC-007: Verify agent deposit filling customer wallet exactly to cap
- TC-030: Verify concurrent deposits exceeding agent balance
- TC-031: Verify concurrent deposits from two agents exceeding customer cap
- TC-056: Verify Stripe cash-in confirmation replay with same payment intent
- TC-057: Verify concurrent Stripe confirmations of same payment intent
- TC-058: Verify Stripe cash-in confirmation with unpaid payment intent
- TC-061: Verify Stripe cash-in confirmation by customer suspended after payment
- TC-020: Verify deposit to inactive customer accounts
- TC-021: Verify deposit from suspended agent
- TC-024: Verify deposit initiated with customer token
- TC-038: Verify SYSTEM deposit to non-agent accounts

### Mid
- TC-044: Verify admin deposit endpoint with agent token
- TC-049: Verify Stripe payment intent creation with non-customer tokens
- TC-053: Verify Stripe payment intent exceeding remaining wallet limit
- TC-035: Verify deposit when a ledger write fails mid-transaction
- TC-012: Verify agent deposit to non-customer accounts
- TC-003: Verify agent deposit with amount at minimum limit
- TC-004: Verify agent deposit with amount below minimum limit
- TC-005: Verify agent deposit with amount at maximum limit
- TC-006: Verify agent deposit with amount above maximum limit
- TC-011: Verify agent deposit with amount equal to agent balance
- TC-014: Verify deposit with invalid amount values
- TC-013: Verify deposit with same from and to account
- TC-017: Verify deposit with non-existent to_account
- TC-018: Verify deposit with non-existent from_account
- TC-019: Verify deposit with missing account fields
- TC-025: Verify deposit initiated with merchant token
- TC-027: Verify deposit with wrong partner secret key
- TC-028: Verify deposit with expired token
- TC-029: Verify deposit with tampered token
- TC-040: Verify SYSTEM deposit with amount exceeding SYSTEM balance
- TC-043: Verify admin deposit to non-SYSTEM account
- TC-046: Verify admin deposit with invalid amount values
- TC-050: Verify Stripe payment intent creation by suspended customer
- TC-051: Verify Stripe payment intent amount boundaries
- TC-052: Verify Stripe payment intent with invalid amount values
- TC-054: Verify Stripe payment intent with wallet at cap
- TC-060: Verify Stripe cash-in confirmation with missing or unknown payment intent id
- TC-062: Verify Stripe cash-in confirmation when wallet cap reached after intent
- TC-064: Verify customer statement and transaction search after deposit

### Low
- TC-032: Verify deposit commission with updated rate in Commissions table
- TC-033: Verify deposit limits with updated min amount in Commissions table
- TC-034: Verify deposit with no active Deposit commission rules
- TC-037: Verify SYSTEM deposit to agent above per-transaction maximum
- TC-039: Verify SYSTEM deposit to itself
- TC-041: Verify SYSTEM deposit with lowercase login identifier
- TC-047: Verify admin deposit with uppercase email login identifier
- TC-063: Verify ledger transaction types for Stripe and admin deposits
- TC-015: Verify deposit with numeric string amount
- TC-016: Verify deposit with amount having more than two decimals

---

## Open Questions

- **Q-1:** What response is expected when `from_account` / `to_account` is missing or not a string? The controller passes `undefined` straight to `Users.findOne` and has no request validator. — blocks TC-019
- **Q-2:** What is the rounding rule for amounts and commission with more than 2 decimals? `debit` / `credit` are `DOUBLE`, and `commission` is returned unrounded. — blocks TC-016
- **Q-3:** Should `stripe/confirm` re-check the wallet cap at confirm time? If yes, what happens to a payment that is already captured (refund, or hold)? — blocks TC-062
- **Q-4:** Should identifier matching be case-insensitive on `/adminDeposit` as it is on `/deposit`? — blocks TC-047
- **Q-5:** Is HTTP 208 the intended status for business-rule rejections (insufficient balance, wallet cap, replayed payment)? The cases above follow the current implementation. — affects TC-008/009/010/030/031/040/053/054/056/057
- **Q-6:** Should an unknown `paymentIntentId` return 4xx instead of 500? — affects TC-060
- **Q-7:** Should a 0% deposit commission be configurable? `config.agentCommissionRate || 0.025` treats a DB rate of `0` as unset. — related to TC-032
- **Q-8:** Is there a per-agent or per-SYSTEM daily deposit cap? None is enforced today; `limitChecker` covers only outgoing Customer transactions. — no case written until confirmed
