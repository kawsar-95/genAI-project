# Test Cases — Deposit / Cash-In

**Scope:** Sanity — happy path, high-risk operations, sibling impact, confirmed boundaries
**Coverage target:** `POST /transaction/deposit`, `POST /transaction/adminDeposit`, `POST /transaction/stripe/create-intent`, `POST /transaction/stripe/confirm`
**Sources:** `controllers/transactions/deposit.controller.js`, `adminDeposit.controller.js`, `stripeCashIn.controller.js`, the `Commissions` table (deposit commission 2.5%, min 10, max 10000), `endpoints.md`

## Test Data & Setup

- Backend `http://localhost:5000`. Frontend `http://localhost:3000` (Stripe page: `/customer/cash-in-bank`). Local/dev only.
- Every protected call sends `Authorization: Bearer <JWT>`, `X-AUTH-SECRET-KEY: ROADTOSDET` and `Content-Type: application/json`.
- Seeded accounts (password `1234`):

| Role | Email | Phone | Approx. balance |
|---|---|---|---|
| Admin | `admin@dmoney.com` | `01686606909` | — |
| SYSTEM | `system@dmoney.com` | `SYSTEM` | ~9,900,133.70 |
| Agent | `salmansrabon+agent@gmail.com` | `01686606901` | ~93,691.75 |
| Customer 1 | `salmansrabon+customer1@gmail.com` | `01686606902` | 1,695 |
| Customer 2 | `salmansrabon+customer2@gmail.com` | `01686606903` | 300 |
| Merchant | `salmansrabon+merchant@gmail.com` | `01686606905` | — |

- **Login:** Admin and SYSTEM: `POST /user/login` returns a JWT directly. Agent and Customer: `POST /user/login` with `{"email":"<email>","password":"1234"}`, then `POST /user/verify-otp?env=dev` with `{"identifier":"<email>","otp":"0000"}` (dev bypass, `DEFAULT_OTP=0000`).
- **Balance check:** `GET /transaction/balance/<phone>`.
- **Fixture accounts** (create once as Admin with `POST /user/create`, then `PATCH /user/update/<id> {"status":"active"}`; password `1234`):

| Fixture | Role | Phone | Email | NID | Used by |
|---|---|---|---|---|---|
| QA-AGENT-1 | Agent | `01700000201` | `qa.agent1@example.com` | `1700000000201` | TC-007, TC-008 |
| QA-AGENT-2 | Agent | `01700000202` | `qa.agent2@example.com` | `1700000000202` | TC-022 |
| QA-AGENT-3 | Agent | `01700000203` | `qa.agent3@example.com` | `1700000000203` | TC-020 |
| QA-CUST-1 | Customer | `01700000101` | `qa.cust1@example.com` | `1700000000101` | TC-005 |
| QA-CUST-2 | Customer | `01700000102` | `qa.cust2@example.com` | `1700000000102` | TC-006 |
| QA-CUST-3 | Customer | `01700000103` | `qa.cust3@example.com` | `1700000000103` | TC-021 |

- **Stripe:** test mode only. Card `4242 4242 4242 4242`, any future expiry, any CVC, any postal code. TC-017 to TC-019 need valid Stripe keys in the backend `.env`.

---

## 1. Requirement Highlights

- **R-1:** An Agent's deposit to a Customer credits the Customer's wallet with the full amount. — _AC-1_ (TC-001)
- **R-2:** The Agent earns a 2.5% commission on each Customer deposit; the Agent's net debit is `amount - commission`. — _AC-2_ (TC-002)
- **R-3:** Customer deposit amount must be 10–10,000 BDT. — _AC-4_ (TC-003, TC-004)
- **R-4:** A Customer's wallet balance cannot exceed 10,000 BDT; a deposit that would exceed it is rejected, naming the remaining room. — _AC-3_ (TC-005, TC-006)
- **R-5:** A deposit cannot make the Agent's balance negative, including under concurrent requests. — _AC-5_ (TC-007, TC-022)
- **R-6:** SYSTEM can top up a regular Agent (no commission, no min/max) but not a Customer or Merchant. — _AC-6_ (TC-011, TC-012)
- **R-7:** Only an Admin can use `/transaction/adminDeposit`, to deposit to SYSTEM. — _AC-7_ (TC-013, TC-014)
- **R-8:** `from_account` must belong to the authenticated user and must be an Agent or SYSTEM; from and to cannot be the same. — _AC-8_ (TC-008, TC-009, TC-010, TC-023)
- **R-9:** A Customer can cash in via Stripe: create a PaymentIntent (Customer role, min 10 BDT), then confirm it. Confirm credits the Customer, debits SYSTEM, checks the intent belongs to the caller, and cannot be replayed. — _AC-9_ (TC-015 to TC-019)
- **R-10:** A suspended account can neither deposit nor receive a deposit. — _AC-10_ (TC-020, TC-021)
- **Roles:** Agent → Customer deposit; SYSTEM → Agent deposit; Admin → SYSTEM deposit; Customer → Stripe cash-in.
- **Out of scope:** `TransactionLimits` daily/monthly count caps (not enforced on deposit); webhook-driven Stripe credit (not implemented).

## 2. Test Cases

### TC-001: Verify Agent deposit to Customer with valid amount
**Test Steps:**
1. Login as Agent `01686606901` and capture the JWT.
2. `GET /transaction/balance/01686606902` and note Customer 1's balance.
3. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01686606902","amount":500}`.
4. `GET /transaction/balance/01686606902` again.

**Expected Result:**
- HTTP 201 with `message` "Deposit successful", a `trnxId`, and `commission` 12.5.
- Customer 1's balance increased by exactly 500 BDT.

### TC-002: Verify Agent commission on a Customer deposit
**Test Steps:**
1. Login as Agent `01686606901`.
2. `GET /transaction/balance/01686606901` and note the Agent's balance.
3. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01686606902","amount":1000}`.
4. `GET /transaction/balance/01686606901` again.

**Expected Result:**
- Response `commission` is 25.
- Agent's balance decreased by 975 (`1000 - 25`), not 1000.

### TC-003: Verify deposit with amount below minimum limit
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01686606902","amount":9}`.

**Expected Result:**
- HTTP 400 with `{"message":"Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"}`.
- No balance change for either account.

### TC-004: Verify deposit with amount above maximum limit
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01686606902","amount":10001}`.

**Expected Result:**
- HTTP 400 with `{"message":"Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"}`.
- No balance change for either account.

### TC-005: Verify deposit to Customer already at maximum wallet cap
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01700000101","amount":10000}` to bring QA-CUST-1 to 10,000 BDT.
3. `GET /transaction/balance/01700000101` and confirm it is 10000.
4. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01700000101","amount":100}`.

**Expected Result:**
- HTTP 208 with `{"message":"Limit exceeded. You cannot deposit any more to this account."}`.
- QA-CUST-1's balance stays 10000.

### TC-006: Verify deposit exceeding remaining wallet cap
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01700000102","amount":9900}` to bring QA-CUST-2 to 9,900 BDT.
3. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01700000102","amount":200}`.

**Expected Result:**
- HTTP 208 with `{"message":"Limit exceeded. You can deposit a maximum of 100.00 tk to this customer."}`.
- QA-CUST-2's balance stays 9900.

### TC-007: Verify deposit by Agent with zero balance
**Test Steps:**
1. Login as QA-AGENT-1 (`qa.agent1@example.com`).
2. `GET /transaction/balance/01700000201` and confirm it is 0.
3. `POST /transaction/deposit` with `{"from_account":"01700000201","to_account":"01686606902","amount":100}`.

**Expected Result:**
- HTTP 208 with `{"message":"Insufficient balance","currentBalance":0}`.
- Customer 1's balance is unchanged.

### TC-008: Verify deposit with another Agent's phone as from_account
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/deposit` with `{"from_account":"01700000201","to_account":"01686606902","amount":100}`.

**Expected Result:**
- HTTP 403 with `{"message":"Unauthorized: you can only initiate transactions from your own account"}`.
- No balance change on any account.

### TC-009: Verify deposit initiated by Customer role
**Test Steps:**
1. Login as Customer 1 (`salmansrabon+customer1@gmail.com`).
2. `POST /transaction/deposit` with `{"from_account":"01686606902","to_account":"01686606905","amount":100}`.

**Expected Result:**
- HTTP 400 with `{"message":"Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit."}`.
- No balance change on any account.

### TC-010: Verify deposit with identical from and to accounts
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01686606901","amount":100}`.

**Expected Result:**
- HTTP 400 with `{"message":"From account and to account cannot be the same"}`.
- Agent's balance is unchanged.

### TC-011: Verify SYSTEM deposit to a regular Agent
**Test Steps:**
1. Login as SYSTEM (`system@dmoney.com`, password `1234`, no OTP).
2. `GET /transaction/balance/01686606901` and note the Agent's balance.
3. `POST /transaction/deposit` with `{"from_account":"SYSTEM","to_account":"01686606901","amount":5000}`.
4. `GET /transaction/balance/01686606901` again.

**Expected Result:**
- HTTP 201 with `message` "SYSTEM deposit to Agent successful" and an `agentBalance` field.
- Agent's balance increased by exactly 5000 (no commission).

### TC-012: Verify SYSTEM deposit to Customer account
**Test Steps:**
1. Login as SYSTEM (`system@dmoney.com`, password `1234`).
2. `POST /transaction/deposit` with `{"from_account":"SYSTEM","to_account":"01686606902","amount":1000}`.

**Expected Result:**
- HTTP 400 with `{"message":"SYSTEM account can only deposit to a regular Agent account. Customer and Merchant accounts are not allowed."}`.
- Customer 1's balance is unchanged.

### TC-013: Verify Admin deposit to SYSTEM account
**Test Steps:**
1. Login as Admin (`admin@dmoney.com`, password `1234`).
2. `GET /transaction/balance/SYSTEM` and note the balance.
3. `POST /transaction/adminDeposit` with `{"from_account":"01686606909","to_account":"SYSTEM","amount":100000}`.
4. `GET /transaction/balance/SYSTEM` again.

**Expected Result:**
- HTTP 201 with `{"message":"Deposit to SYSTEM account successful","amount":100000}`.
- SYSTEM's balance increased by 100000.

### TC-014: Verify adminDeposit access with Customer role
**Test Steps:**
1. Login as Customer 1 (`salmansrabon+customer1@gmail.com`).
2. `POST /transaction/adminDeposit` with `{"from_account":"01686606902","to_account":"SYSTEM","amount":100}`.

**Expected Result:**
- HTTP 403 with `{"message":"Only Admin can use this deposit endpoint"}`.
- SYSTEM's balance is unchanged.

### TC-015: Verify Stripe create-intent with Agent role
**Test Steps:**
1. Login as Agent `01686606901`.
2. `POST /transaction/stripe/create-intent` with `{"amount":1000}`.

**Expected Result:**
- HTTP 403 with `{"message":"Only customers can use bank cash-in"}`.
- No PaymentIntent is returned.

### TC-016: Verify Stripe create-intent with amount below minimum
**Test Steps:**
1. Login as Customer 1 (`salmansrabon+customer1@gmail.com`).
2. `POST /transaction/stripe/create-intent` with `{"amount":5}`.

**Expected Result:**
- HTTP 400 with `{"message":"Minimum cash-in amount is 10 tk"}`.
- No PaymentIntent is returned.

### TC-017: Verify Stripe cash-in confirmation with valid payment
**Test Steps:**
1. Login as Customer 1 (`salmansrabon+customer1@gmail.com`).
2. `GET /transaction/balance/01686606902` and note the balance. Also note SYSTEM's balance.
3. `POST /transaction/stripe/create-intent` with `{"amount":500}` and note the PaymentIntent id (`pi_...`).
4. In the frontend at `/customer/cash-in-bank`, pay with card `4242 4242 4242 4242` (any future expiry, CVC, postal code) so the PaymentIntent succeeds.
5. `POST /transaction/stripe/confirm` with `{"paymentIntentId":"<pi_...>"}`.
6. `GET /transaction/balance/01686606902` and `GET /transaction/balance/SYSTEM` again.

**Expected Result:**
- Response `message` "Cash in successful" with `trnxId` equal to the PaymentIntent id and `amount` 500.
- Customer 1's balance increased by exactly 500; SYSTEM's balance decreased by exactly 500.
- Two ledger rows share `trnxId` = PaymentIntent id: SYSTEM `debit=500, credit=0` and Customer 1 `debit=0, credit=500`, both with description "Bank Cash In (Stripe)".

### TC-018: Verify Stripe confirm with another Customer's PaymentIntent
**Test Steps:**
1. Login as Customer 1 and create a PaymentIntent with `POST /transaction/stripe/create-intent {"amount":500}`; complete the payment in the frontend with card `4242 4242 4242 4242`. Note the id (`pi_...`).
2. Login as Customer 2 (`salmansrabon+customer2@gmail.com`).
3. `POST /transaction/stripe/confirm` with `{"paymentIntentId":"<Customer 1's pi_...>"}`.

**Expected Result:**
- HTTP 403 with `{"message":"Payment intent does not belong to this account"}`.
- Customer 2's balance is unchanged.

### TC-019: Verify Stripe confirm replay with a processed PaymentIntent
**Test Steps:**
1. Complete TC-017 so a PaymentIntent has been confirmed successfully.
2. As the same Customer, `POST /transaction/stripe/confirm` again with the same `{"paymentIntentId":"<pi_...>"}`.
3. `GET /transaction/balance/01686606902`.

**Expected Result:**
- HTTP 208 with `{"message":"This payment has already been processed"}`.
- Customer 1's balance is unchanged by the replay.

### TC-020: Verify deposit initiated by suspended Agent
**Test Steps:**
1. Login as QA-AGENT-3 (`qa.agent3@example.com`) and capture the JWT.
2. As Admin, `PATCH /user/update/<QA-AGENT-3 id>` with `{"status":"suspended"}`.
3. With QA-AGENT-3's JWT, `POST /transaction/deposit` with `{"from_account":"01700000203","to_account":"01686606902","amount":100}`.

**Expected Result:**
- HTTP 403 with `{"message":"From account is not active. Please contact admin."}`.
- Customer 1's balance is unchanged.

### TC-021: Verify deposit to suspended Customer
**Test Steps:**
1. As Admin, `PATCH /user/update/<QA-CUST-3 id>` with `{"status":"suspended"}`.
2. Login as Agent `01686606901`.
3. `POST /transaction/deposit` with `{"from_account":"01686606901","to_account":"01700000103","amount":100}`.

**Expected Result:**
- HTTP 403 with `{"message":"To account is not active. Please contact admin."}`.
- QA-CUST-3's balance is unchanged and the Agent's balance is unchanged.

### TC-022: Verify concurrent deposits exceeding Agent balance
**Test Steps:**
1. Login as SYSTEM and `POST /transaction/deposit` with `{"from_account":"SYSTEM","to_account":"01700000202","amount":1000}` to give QA-AGENT-2 a balance of 1,000.
2. Login as QA-AGENT-2 (`qa.agent2@example.com`).
3. Fire two `POST /transaction/deposit` requests at the same time, each `{"from_account":"01700000202","to_account":"01686606902","amount":600}` (for example two background `curl` commands followed by `wait`).
4. `GET /transaction/balance/01700000202`.

**Expected Result:**
- Exactly one request succeeds; the other returns the insufficient-balance response (HTTP 208, as in TC-007).
- QA-AGENT-2's balance is never negative: only one deposit is applied, so the balance falls by the net debit of 585 (`600 - 15` commission) and ends at 415.

### TC-023: Verify deposit from SYSTEM account initiated by Customer
**Test Steps:**
1. Login as Customer 1 (`salmansrabon+customer1@gmail.com`).
2. `POST /transaction/deposit` with `{"from_account":"SYSTEM","to_account":"01686606902","amount":100}`.

**Expected Result:**
- HTTP 403 with `{"message":"Unauthorized: you can only initiate transactions from your own account"}`.
- Customer 1's balance is unchanged.

## 3. Prioritized Test Titles

**Type tags** (one primary type per case):

| Tag | Meaning in this set |
|---|---|
| **Sanity** | Core happy path. If it fails, the deposit feature is down and further testing is pointless. |
| **Feature** | A deposit business rule: commission, min/max amount, wallet cap, balance, account status, allowed account pairs. |
| **Regression** | A sibling cash-in flow that shares the deposit ledger (Admin deposit, Stripe cash-in), re-checked so it still works. |
| **Security** | Authorization: role, account ownership, cross-user access, replay. |
| **System Architecture** | Ledger integrity under concurrency, relying on the transaction lock (`FOR UPDATE`). |
| **Non-functional** | Performance, load, reliability. No case in this set has this tag yet; see the note below. |

### High

| TC | Test title | Expected result | Type |
|---|---|---|---|
| TC-001 | Verify Agent deposit to Customer with valid amount | 201 "Deposit successful", and the Customer's balance goes up by exactly 500 | Sanity |
| TC-002 | Verify Agent commission on a Customer deposit | `commission` is 25, and the Agent's balance falls by 975 (1000 − 25), not 1000 | Feature |
| TC-011 | Verify SYSTEM deposit to a regular Agent | 201 "SYSTEM deposit to Agent successful", and the Agent's balance goes up by exactly 5000 with no commission | Feature |
| TC-013 | Verify Admin deposit to SYSTEM account | 201 "Deposit to SYSTEM account successful", and SYSTEM's balance goes up by 100000 | Regression |
| TC-017 | Verify Stripe cash-in confirmation with valid payment | "Cash in successful". The Customer goes up by 500 and SYSTEM goes down by 500, in two ledger rows that share the PaymentIntent id | Regression |
| TC-005 | Verify deposit to Customer already at maximum wallet cap | 208 "Limit exceeded. You cannot deposit any more to this account.", and the balance stays 10000 | Feature |
| TC-007 | Verify deposit by Agent with zero balance | 208 "Insufficient balance" with `currentBalance` 0, and the Customer's balance is unchanged | Feature |
| TC-022 | Verify concurrent deposits exceeding Agent balance | Exactly one of the two parallel deposits succeeds (the other gets 208), and the Agent ends at 415 and never goes negative | System Architecture |
| TC-008 | Verify deposit with another Agent's phone as from_account | 403 "Unauthorized: you can only initiate transactions from your own account", and no balance changes | Security |
| TC-023 | Verify deposit from SYSTEM account initiated by Customer | 403 "Unauthorized: you can only initiate transactions from your own account", and the Customer's balance is unchanged | Security |
| TC-009 | Verify deposit initiated by Customer role | 400 "Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit.", and no balance changes | Security |
| TC-012 | Verify SYSTEM deposit to Customer account | 400 "SYSTEM account can only deposit to a regular Agent account…", and the Customer's balance is unchanged | Feature |
| TC-014 | Verify adminDeposit access with Customer role | 403 "Only Admin can use this deposit endpoint", and SYSTEM's balance is unchanged | Security |
| TC-015 | Verify Stripe create-intent with Agent role | 403 "Only customers can use bank cash-in", and no PaymentIntent is returned | Security |
| TC-018 | Verify Stripe confirm with another Customer's PaymentIntent | 403 "Payment intent does not belong to this account", and Customer 2's balance is unchanged | Security |

### Mid

| TC | Test title | Expected result | Type |
|---|---|---|---|
| TC-003 | Verify deposit with amount below minimum limit | 400 "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk", and no balance changes | Feature |
| TC-004 | Verify deposit with amount above maximum limit | 400 with the same min/max message, and no balance changes | Feature |
| TC-006 | Verify deposit exceeding remaining wallet cap | 208 "Limit exceeded. You can deposit a maximum of 100.00 tk to this customer.", and the balance stays 9900 | Feature |
| TC-020 | Verify deposit initiated by suspended Agent | 403 "From account is not active. Please contact admin.", and the Customer's balance is unchanged | Feature |
| TC-021 | Verify deposit to suspended Customer | 403 "To account is not active. Please contact admin.", and neither balance changes | Feature |
| TC-010 | Verify deposit with identical from and to accounts | 400 "From account and to account cannot be the same", and the Agent's balance is unchanged | Feature |
| TC-016 | Verify Stripe create-intent with amount below minimum | 400 "Minimum cash-in amount is 10 tk", and no PaymentIntent is returned | Regression |
| TC-019 | Verify Stripe confirm replay with a processed PaymentIntent | 208 "This payment has already been processed", and the balance is unchanged by the replay | Security |

**Type summary:** Sanity 1 · Feature 11 · Regression 3 · Security 7 · System Architecture 1 · Non-functional 0.

> **Note: no Non-functional case.** This set has no performance or load case. Response time under parallel deposits, and how the lock behaves under load, are untested. TC-022 checks correctness under concurrency, not speed. If you need one, add a separate case with an agreed response-time target. The requirements don't define one.

## Open Questions

- Q-1: Is a Customer balance of exactly 10,000 BDT allowed (cap is "exceed", not "reach")? TC-005 assumes the 10,000 deposit to a zero-balance Customer succeeds — blocks TC-005.
- Q-2: What is the default `status` of a user created via `POST /user/create`? The setup assumes it must be set to `active` — blocks all fixture-based cases.
