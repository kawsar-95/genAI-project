# Test Cases — Deposit / Cash-In

**Tree:** `dmoney-transaction-api` @ `HEAD` on `master`, dirty
**DB:** `dmoneydb` @ `127.0.0.1:3306`
**Test scope:** Sanity — happy path, high-risk operations, sibling impact, confirmed boundaries
**Coverage target:** `POST /transaction/deposit`, `POST /transaction/adminDeposit`, `POST /transaction/stripe/create-intent`, `POST /transaction/stripe/confirm`, `GET /transaction/limit/:account`

---

## 1. Feature Summary

dMoney lets a Customer load money into their wallet through three paths: an Agent deposits to a Customer's account (the primary cash-in), an Agent is topped up by the SYSTEM account (so the Agent has funds to deposit), and a Customer cashes in directly via Stripe. Each Customer has a maximum wallet balance cap of 10,000 BDT; a per-transaction min of 10 BDT and max of 10,000 BDT; and a Customer daily/monthly transaction-count limit. The Agent earns a 2.5% commission on each deposit they make to a Customer.

## 2. Acceptance Criteria

- AC-1 — A Customer can receive a deposit from an Agent and the full amount lands in their wallet.
- AC-2 — An Agent earns a commission on each successful Customer deposit, credited to the Agent's account.
- AC-3 — A Customer's wallet balance cannot exceed the maximum cap of 10,000 BDT — further deposits are rejected.
- AC-4 — Deposits below the minimum amount (10 BDT) or above the maximum (10,000 BDT) are rejected.
- AC-5 — A Customer with insufficient funds cannot have their balance go negative as a result of a transaction.
- AC-6 — The SYSTEM account can top up an Agent account so the Agent has funds to deposit.
- AC-7 — An Admin can deposit to the SYSTEM account to seed the platform pool.
- AC-8 — The system rejects a deposit where `from_account` belongs to a different user than the authenticated Agent.
- AC-9 — A Customer can cash in via Stripe by creating a PaymentIntent and confirming it.
- AC-10 — A suspended account cannot deposit or receive a deposit.

> Source: derived from `controllers/transactions/deposit.controller.js`, `controllers/transactions/adminDeposit.controller.js`, `controllers/transactions/stripeCashIn.controller.js`, `controllers/transactions/transactionDetails.controller.js`, and `Commission` table (deposit commission 2.5%, min 10, max 10000).

## 3. Basic Test — verify the feature works end to end

**Environment preconditions:**
- Backend running at `http://localhost:5000` (already verified up: `{"message":"Server is up"}`)
- MySQL running at `127.0.0.1:3306` with `dmoneydb` seeded (verified: 10 users, 35 transactions, balances as documented below)
- Seeded accounts: Agent `01686606901` with balance ~93,691.75 BDT; Customer1 `01686606902` with balance 1,695 BDT; Customer2 `01686606903` with balance 300 BDT; SYSTEM balance ~9,900,133.70 BDT
- Use `http://localhost:3000` (frontend) for the Stripe cash-in path; test cards: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code

**Login and role:**
- Agent login: `POST /user/login` with `{"email":"salmansrabon+agent@gmail.com","password":"1234"}` → OTP step (use seeded OTP bypass `?env=dev` + `0000` per `.env` `DEFAULT_OTP=0000`).
- Customer login: same flow with `salmansrabon+customer1@gmail.com`.
- Admin login: `{"email":"admin@dmoney.com","password":"1234"}` (Admin skips OTP).

**Navigation:** not applicable — feature is API-only; no UI path.

**Steps:**

1. Login as Agent (`01686606901`); capture JWT.
2. Note Agent's current balance: `GET /transaction/balance/01686606901` → expect ~93,691.75.
3. Note Customer1's current balance: `GET /transaction/balance/01686606902` → expect 1,695.
4. As Agent, call `POST /transaction/deposit` with `{from_account: "01686606901", to_account: "01686606902", amount: 500}`. Expect HTTP 201 with `{"message":"Deposit successful","trnxId":"...","commission":12.5,"currentBalance":<agent balance minus 500>}`.
5. Re-query both balances: Agent balance decreased by 500, Customer1 balance increased by 500. Commission of 12.5 BDT stays with the Agent (their effective loss is 487.5, not 500).
6. As Customer1, call `GET /transaction/statement/01686606902?count=5` — the top transaction should be the 500 BDT deposit with description "Deposit".
7. (Optional, requires Stripe keys) As Customer1, call `POST /transaction/stripe/create-intent` with `{"amount": 1000}`. Expect `{"clientSecret":"pi_...","amount":1000,...}`. Complete the Stripe form on the frontend. Call `POST /transaction/stripe/confirm` with `{"paymentIntentId": "pi_..."}`. Expect `{"message":"Cash in successful","trnxId":"pi_...","amount":1000,...}`.
8. Verify the Customer1 balance increased by 1000 (and a `transaction_type = NULL` row with description "Bank Cash In (Stripe)" appears).

**What proves it passed:** Two ledger entries appear per deposit (one debit on Agent, one credit on Customer); Agent balance drops by `amount - commission`; Customer balance increases by exactly `amount`; both rows share the same `trnxId`.

**Fixture setup:** none needed — seeded data is sufficient.

## 4. System Behavior Tests

### TC-001
**Test Title:** Verify that an Agent's deposit to a Customer increases the Customer's wallet by the exact deposited amount.
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:** Agent (`01686606901`) has balance > 500 BDT; Customer1 (`01686606902`) is `active`.
**Test Data:** amount = 500 BDT
**Steps:**
1. Login as Agent → JWT.
2. `POST /transaction/deposit {from:"01686606901", to:"01686606902", amount:500}`.
3. `GET /transaction/balance/01686606902` (or query DB).
**Expected Result:** Customer1 balance increases by exactly 500 BDT; HTTP 201 with `commission:12.5`.

### TC-002
**Test Title:** Verify that an Agent earns a 2.5% commission when depositing to a Customer.
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:** Agent balance > amount.
**Test Data:** amount = 1000 BDT (commission = 25)
**Steps:**
1. Note Agent balance before.
2. `POST /transaction/deposit {amount:1000}`.
3. Note Agent balance after.
**Expected Result:** Agent balance decreased by `1000 - 25 = 975` (NOT 1000); response `commission:25`.

### TC-003
**Test Title:** Verify that a deposit below the minimum amount is rejected.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** none
**Test Data:** amount = 9 BDT (min is 10)
**Steps:** `POST /transaction/deposit {amount:9}`.
**Expected Result:** HTTP 400 with `{"message":"Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"}`. No DB write.

### TC-004
**Test Title:** Verify that a deposit above the maximum amount is rejected.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** amount = 10001 BDT
**Steps:** `POST /transaction/deposit {amount:10001}`.
**Expected Result:** HTTP 400 with the same min/max message.

### TC-005
**Test Title:** Verify that a deposit is rejected when the Customer's wallet is already at the maximum cap.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Customer balance >= 10000 BDT (e.g. manually credit via DB or run enough deposits).
**Test Data:** amount = 100 BDT
**Steps:** `POST /transaction/deposit {amount:100}`.
**Expected Result:** HTTP 208 with `{"message":"Limit exceeded. You cannot deposit any more to this account."}`. No DB write.

### TC-006
**Test Title:** Verify that a deposit that would exceed the remaining cap is rejected with the exact remaining amount named.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Customer balance = 9,900 BDT (cap 10,000, remaining 100).
**Test Data:** amount = 200 BDT
**Steps:** `POST /transaction/deposit {amount:200}`.
**Expected Result:** HTTP 208 with `{"message":"Limit exceeded. You can deposit a maximum of 100.00 tk to this customer."}`.

### TC-007
**Test Title:** Verify that a deposit is rejected when the Agent has insufficient balance.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Agent balance = 0 (set via DB or use a fresh agent).
**Test Data:** amount = 100 BDT
**Steps:** `POST /transaction/deposit {amount:100}`.
**Expected Result:** HTTP 208 with `{"message":"Insufficient balance","currentBalance":0}`.

### TC-008
**Test Title:** Verify that an Agent cannot deposit on behalf of another Agent by spoofing the from_account.
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Two Agents exist (Agent `01686606901` and a second agent — register one via `/user/register` with role "Agent").
**Test Data:** from_account = second agent's phone, to_account = Customer
**Steps:** As Agent `01686606901`, `POST /transaction/deposit {from: <second agent phone>, to: <customer>, amount:100}`.
**Expected Result:** HTTP 403 with `{"message":"Unauthorized: you can only initiate transactions from your own account"}`.

### TC-009
**Test Title:** Verify that a Customer cannot initiate a deposit (only Agent or SYSTEM can).
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** from_account = Customer's own phone
**Steps:** As Customer, `POST /transaction/deposit {from: <customer phone>, to: <merchant phone>, amount:100}`.
**Expected Result:** HTTP 400 with `{"message":"Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit."}`.

### TC-010
**Test Title:** Verify that a deposit where from_account equals to_account is rejected.
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A
**Test Data:** same phone for both
**Steps:** `POST /transaction/deposit {from:"01686606901", to:"01686606901", amount:100}`.
**Expected Result:** HTTP 400 with `{"message":"From account and to account cannot be the same"}`.

### TC-011
**Test Title:** Verify that the SYSTEM account can deposit to a regular Agent (Flow 1).
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** SYSTEM has sufficient balance.
**Test Data:** from = "SYSTEM", to = Agent phone, amount = 5000
**Steps:** Login as SYSTEM (`system@dmoney.com` + OTP bypass for SYSTEM login path is the same as Admin skip-OTP), then `POST /transaction/deposit {from:"SYSTEM", to:"01686606901", amount:5000}`.
**Expected Result:** HTTP 201 with `{"message":"SYSTEM deposit to Agent successful","agentBalance":<new>}`.

### TC-012
**Test Title:** Verify that the SYSTEM account cannot deposit to a Customer or Merchant.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** from = "SYSTEM", to = Customer phone
**Steps:** As SYSTEM, `POST /transaction/deposit {from:"SYSTEM", to:"01686606902", amount:1000}`.
**Expected Result:** HTTP 400 with `{"message":"SYSTEM account can only deposit to a regular Agent account. Customer and Merchant accounts are not allowed."}`.

### TC-013
**Test Title:** Verify that the Admin can deposit to the SYSTEM account.
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** from_account = Admin phone, to_account = "SYSTEM", amount = 100000
**Steps:** Login as Admin, `POST /transaction/adminDeposit {from:"01686606909", to:"SYSTEM", amount:100000}`.
**Expected Result:** HTTP 201 with `{"message":"Deposit to SYSTEM account successful","amount":100000}`.

### TC-014
**Test Title:** Verify that a non-Admin cannot call /transaction/adminDeposit.
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** n/a
**Steps:** As Customer, `POST /transaction/adminDeposit {from:"01686606902", to:"SYSTEM", amount:100}`.
**Expected Result:** HTTP 403 with `{"message":"Only Admin can use this deposit endpoint"}`.

### TC-015
**Test Title:** Verify that Stripe create-intent requires Customer role and active status.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** n/a
**Steps:** As Agent, `POST /transaction/stripe/create-intent {amount:1000}`.
**Expected Result:** HTTP 403 with `{"message":"Only customers can use bank cash-in"}`.

### TC-016
**Test Title:** Verify that Stripe create-intent rejects amounts below the minimum.
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A
**Test Data:** amount = 5 BDT
**Steps:** As Customer, `POST /transaction/stripe/create-intent {amount:5}`.
**Expected Result:** HTTP 400 with `{"message":"Minimum cash-in amount is 10 tk"}`.

### TC-017
**Test Title:** Verify that Stripe confirm credits the customer and debits SYSTEM by the exact amount.
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** A valid succeeded Stripe PaymentIntent with `metadata.customer_phone = <customer>`.
**Test Data:** amount = 500 BDT
**Steps:** As Customer, `POST /transaction/stripe/confirm {paymentIntentId:"pi_..."}`. Then query DB for the two new Transactions rows.
**Expected Result:** Two rows with the same `trnxId = paymentIntentId`: one on `account = "SYSTEM"` with `debit=500,credit=0`, one on `account = <customer>` with `debit=0,credit=500`. Both have `description = "Bank Cash In (Stripe)"`. (Note: `transaction_type` will be NULL — see bug file 02 §"transaction_type is missing on the Stripe cash-in ledger rows".)

### TC-018
**Test Title:** Verify that Stripe confirm rejects when the PaymentIntent's metadata doesn't match the authenticated customer.
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Customer A starts a Stripe cash-in; Customer B captures A's `paymentIntentId`.
**Test Data:** n/a
**Steps:** As Customer B, `POST /transaction/stripe/confirm {paymentIntentId:"pi_..._for_customer_A"}`.
**Expected Result:** HTTP 403 with `{"message":"Payment intent does not belong to this account"}`.

### TC-019
**Test Title:** Verify that Stripe confirm is idempotent — replaying the same paymentIntentId is rejected.
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A
**Preconditions:** A successful Stripe confirm has already been performed.
**Test Data:** n/a
**Steps:** Replay the same `POST /transaction/stripe/confirm {paymentIntentId:"pi_..."}`.
**Expected Result:** HTTP 208 with `{"message":"This payment has already been processed"}`.

### TC-020
**Test Title:** Verify that a suspended Agent cannot initiate a deposit.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Agent status set to `suspended` via DB or admin PATCH.
**Test Data:** amount = 100
**Steps:** As suspended Agent, `POST /transaction/deposit {amount:100}`.
**Expected Result:** HTTP 403 with `{"message":"From account is not active. Please contact admin."}`. Note: this check is only on `from_account`; the `to_account` status check is also present but the deposit will already have failed at the `from` check.

### TC-021
**Test Title:** Verify that a deposit is rejected when the recipient account is suspended.
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Target Customer suspended.
**Test Data:** amount = 100
**Steps:** As Agent, `POST /transaction/deposit {to: <suspended customer phone>, amount:100}`.
**Expected Result:** HTTP 403 with `{"message":"To account is not active. Please contact admin."}`.

### TC-022
**Test Title:** Verify that two concurrent deposits do not let the Agent's balance go negative.
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A
**Preconditions:** Agent balance = 1000.
**Test Data:** 2 concurrent requests of amount=600 each.
**Steps:** Fire two `POST /transaction/deposit` requests in parallel (e.g. via `xargs -P 2`).
**Expected Result:** Exactly one succeeds; the other returns HTTP 208 `INSUFFICIENT_BALANCE`. Net Agent balance decreases by exactly 600 (or stays the same if the second fails). No balance < 0.

### TC-023
**Test Title:** Verify that the Customer cannot trigger a deposit to themselves using the SYSTEM account as from_account.
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A
**Test Data:** from = "SYSTEM"
**Steps:** As Customer, `POST /transaction/deposit {from:"SYSTEM", to:"01686606902", amount:100}`.
**Expected Result:** HTTP 403 with `{"message":"Unauthorized: you can only initiate transactions from your own account"}`. (Verified live — `req.user.identifier` is the Customer's email/phone, which doesn't match SYSTEM's.)

## 5. White-box Tests

(No justified white-box cases — every behavior above is reachable through the API and observable through the response. White-box would only add value for testing internal validation logic that's already covered by black-box boundary tests.)

`No additional whitebox tests are justified.`

## 6. Coverage Summary

| AC | Cases |
|---|---|
| AC-1 | TC-001 |
| AC-2 | TC-002 |
| AC-3 | TC-005, TC-006 |
| AC-4 | TC-003, TC-004 |
| AC-5 | TC-007, TC-022 |
| AC-6 | TC-011, TC-012 |
| AC-7 | TC-013, TC-014 |
| AC-8 | TC-008, TC-023 |
| AC-9 | TC-015, TC-016, TC-017, TC-018, TC-019 |
| AC-10 | TC-020, TC-021 |

## Not covered

- **`TransactionLimits` table daily/monthly transaction-count cap.** The hardcoded limit endpoint ignores the table; there's no enforcement point for it in deposit. Out of sanity scope — would be its own test set.
- **Webhook-driven Stripe credit.** The current implementation relies on client `confirm`, not Stripe webhook. The webhook path is not implemented.

## 7. Top Test Cases — black-box quick list

- Verify that an Agent's deposit to a Customer increases the Customer's wallet by the exact deposited amount.
- Verify that an Agent earns a 2.5% commission when depositing to a Customer.
- Verify that a deposit below the minimum amount is rejected.
- Verify that a deposit above the maximum amount is rejected.
- Verify that a deposit is rejected when the Customer's wallet is already at the maximum cap.
- Verify that the SYSTEM account can deposit to a regular Agent.
- Verify that the Admin can deposit to the SYSTEM account.
- Verify that an Agent cannot deposit on behalf of another Agent by spoofing the from_account.
- Verify that Stripe confirm credits the customer and debits SYSTEM by the exact amount.
- Verify that two concurrent deposits do not let the Agent's balance go negative.
