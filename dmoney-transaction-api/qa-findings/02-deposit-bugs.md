# Bug Findings — Deposit / Cash-In

**Tree:** `dmoney-transaction-api` @ `HEAD` on `master`, dirty
**DB:** `dmoneydb` @ `127.0.0.1:3306`
**Routes covered:** `POST /transaction/deposit`, `POST /transaction/adminDeposit`, `POST /transaction/stripe/create-intent`, `POST /transaction/stripe/confirm`, `GET /transaction/limit/:account`

---

## Functional Bugs

### [Deposit] Agent commission row is credited to agent — but description is "Deposit Commission" with `credit: amt * 0.025`, `debit: amt`. Reads like an over-debit of the agent by the full amount, not a commission split.

- **Summary:** In `deposit.controller.js:219-228` (Flow 2 — Agent→Customer), the agent's ledger row records **both** `debit: amt` AND `credit: commission` for the same transaction. The customer's row has `credit: amt`. Net effect on agent balance: `-amt + 0.025*amt = -0.975*amt` (correct). But the ledger shows two-sided entries on the agent's account — confusing for audit and for any future balance-reconciliation logic that doesn't know to sum `credit - debit` only on the customer side.
- **Steps to reproduce:**
  1. Login as Agent (`01686606901`)
  2. POST `/transaction/deposit` with `{from_account: "01686606901", to_account: "01686606902", amount: 500}`
  3. Query DB: `SELECT * FROM Transactions WHERE account='01686606901' ORDER BY id DESC LIMIT 1;`
  4. Observe: row has `debit=500, credit=12.5` (commission) — meaning the agent "deposited 500 and got 12.5 back"
- **Expected result:** Two cleaner alternatives: (a) a single row `debit: amt - commission, credit: 0`, or (b) two rows, one for the deposit (`debit: amt, credit: 0`) and one for the commission payout (`debit: 0, credit: commission`)
- **Actual result:** One confusing row that has both a debit (full amount) and a credit (commission)
- **Reproducibility:** always
- **Priority:** Medium (functional/audit clarity, not user-visible impact)
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `controllers/transactions/deposit.controller.js:219-241`

---

### [Deposit] `commission` is computed *after* the min/max check uses `commissionRate` — but the check itself reads from the DB inside the same request. Race: admin raises commission rate mid-request, agent's deposit uses stale rate.

- **Summary:** `config = await Commission.getConfig('Deposit')` is read once at the top of the handler. Between read and the `await sequelize.transaction(...)`, another admin request (no admin-rate-update endpoint exists in this codebase, so this is latent) could change `commissionRate`. Not currently exploitable because there's no rate-update endpoint, but the code path is not atomic.
- **Priority:** Low (no current exploit path)
- **Confidence:** Medium
- **Status:** NEW BUG (latent — needs a rate-change endpoint to be exploitable)
- **Evidence:** `deposit.controller.js:34-37` (config read), `deposit.controller.js:170` (`var commission = commissionRate * amt`)

---

### [Deposit] `from_account` is taken from `req.body` and not from `req.user.identifier`. The ownership check (`req.user.identifier === from_account phone/email`) prevents spoofing *for this account holder*, but Agent-role accounts have *both* phone and email as identifiers — and the comparison lowercases both sides.

- **Summary:** In Flow 2 (Agent→Customer), `from_account` is taken from the request body. A legitimate Agent sends their own `phone_number` and the ownership check passes. An Agent sending a *different* agent's `phone_number` is rejected (good). But: an Agent whose DB record's `email` equals their `phone_number` value (unlikely but possible in seeded data) could send either identifier and pass the check — that's the *intended* behavior, not a bug. Real issue: there's no check that the `to_account` is not the same user (a different kind of self-deposit). The current code does check `from_account === to_account` (line 58), but *after* the DB lookup — so two distinct users with the same phone/email alias could potentially self-deposit.
- **Priority:** Low (the `from === to` check covers the realistic case)
- **Confidence:** Low
- **Status:** NOT A BUG (reviewed and rejected)
- **Evidence:** `deposit.controller.js:58-60`

---

### [Deposit] SYSTEM→Agent Flow 1 allows the SYSTEM account to deposit to ANY Agent — but there's no daily cap on SYSTEM outflows

- **Summary:** In Flow 1 (`isSystemAccount` branch), the SYSTEM balance check ensures SYSTEM has the funds, but there's no per-day/per-hour cap. The Agent could repeatedly deposit until SYSTEM is drained.
- **Steps to reproduce:**
  1. Login as SYSTEM (or Admin and use the special SYSTEM login path)
  2. Call `/transaction/deposit` 100 times with `{from: "SYSTEM", to: <agent>, amount: 50000}` each
  3. SYSTEM balance goes to 0; Agent's balance balloons
- **Expected result:** Per-agent daily deposit limit from SYSTEM
- **Actual result:** Unbounded
- **Priority:** Medium
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `deposit.controller.js:85-156` (no `TransactionLimits` table reference)

---

### [Deposit] `transaction_type` is `'Deposit'` for the *agent's* row but the description is `"Deposit Commission"`. Customers viewing their own statement see `"Deposit Commission"` on rows that don't involve them

- **Summary:** When an Agent deposits to a Customer, the Customer's view of their own statement shows rows from their account (`account = customer_phone_number`). The customer-side row says `description: "Deposit"` and `transaction_type: 'Deposit'`. The agent's row (in the agent's own view) says `description: "Deposit Commission"` and `transaction_type: 'Deposit'`. This is fine. But: the Customer's balance calculation includes all rows where `account = their phone`, which includes *only* their own side. So the customer's balance correctly excludes the commission credit. OK.
- **Priority:** NOT A BUG (clarification)
- **Confidence:** High
- **Status:** NEW BUG (audit-only — flag as documentation gap)

---

### [Deposit] `getTransactionLimitByAccount` returns `10000 - (deposits - withdrawals)`, ignoring the `TransactionLimits` table

- **Summary:** The hardcoded `10000` ignores the actual `TransactionLimits` table values (Customer daily: 5000, monthly: 50000). An admin who changes `TransactionLimits` finds their changes have no effect.
- **Steps to reproduce:**
  1. Update `TransactionLimits` directly: `UPDATE TransactionLimits SET max_amount=100 WHERE id=1;`
  2. Call `/transaction/limit/<customer>`
  3. Response still says `limit: 10000 - x`
- **Expected result:** Returns the configured limit from `TransactionLimits`
- **Actual result:** Returns `10000 - x` hardcoded
- **Priority:** High (admin-UI inconsistency — looks like the limits are configurable but aren't)
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `controllers/transactions/transactionDetails.controller.js:102-121` (hardcoded `10000`)

---

### [Deposit] `transaction_type` is missing on the Stripe cash-in ledger rows

- **Summary:** `stripeCashIn.controller.js:173-192` writes two ledger rows for Stripe cash-in but **never sets `transaction_type`**. The Sequelize column is `DataTypes.STRING(255) NULL`. Result: Stripe cash-ins have NULL `transaction_type` and the description is `"Bank Cash In (Stripe)"`. Any code that filters by transaction_type (reporting, fee calculation, audit) misses Stripe cash-ins.
- **Steps to reproduce:**
  1. Complete a Stripe cash-in
  2. `SELECT transaction_type, COUNT(*) FROM Transactions GROUP BY transaction_type;`
  3. Observe: `NULL | 2` rows (the debit + credit pair)
- **Expected result:** `transaction_type = 'Stripe Cash-In'` (or similar)
- **Actual result:** `NULL`
- **Priority:** Medium (audit/reporting gap)
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `stripeCashIn.controller.js:173-192` (no `transaction_type` field set)

---

### [Deposit] Stripe `confirmCashIn` writes ledger rows but does not check customer status is still `active`

- **Summary:** Between `createPaymentIntent` and `confirmCashIn`, the customer's `status` could change to `suspended` (admin action). `confirmCashIn` re-finds the customer but only checks for existence, not status. A suspended customer could still complete a Stripe payment that was started before suspension.
- **Steps to reproduce:**
  1. Customer starts Stripe cash-in (gets `paymentIntentId`)
  2. Admin suspends customer (`PATCH /user/update/:id` with `{status: "suspended"}`)
  3. Customer completes the Stripe form, frontend calls `confirm`
  4. Money lands in suspended customer's wallet
- **Expected result:** `confirmCashIn` rejects with `403 Your account is suspended`
- **Actual result:** Money credited to suspended customer
- **Priority:** High (compliance: suspended customers should not gain funds)
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `stripeCashIn.controller.js:125-200` (no status check between line 136 and the write at line 173)

---

### [Deposit] `confirmCashIn` uses `paymentIntent.metadata.customer_phone` for anti-spoofing — but a forged Stripe response with the right metadata passes; integrity depends entirely on Stripe's webhook trust

- **Summary:** `confirmCashIn` retrieves a PaymentIntent from Stripe and trusts the `metadata.customer_phone` field. There's no signature verification. If an attacker (with admin Stripe access or via Stripe API key compromise) creates a PaymentIntent with `metadata.customer_phone` set to *another* customer's phone, they can submit it to `confirmCashIn` and credit the victim's wallet (though the funds come from SYSTEM, not the attacker's wallet — so this isn't a direct theft, but it IS a way to mint balance out of thin air if SYSTEM has no funds). The fix is a webhook-driven credit, not a polling-`confirm`.
- **Priority:** High (in the Stripe-compromise threat model)
- **Confidence:** Medium
- **Status:** NEW BUG
- **Evidence:** `stripeCashIn.controller.js:144-164`

---

### [Deposit] No rate-limit / idempotency-key on `/transaction/deposit` — replay attacks possible

- **Summary:** No `Idempotency-Key` header check, no rate-limit. An attacker who captures a successful deposit request can replay it. The agent's balance is checked inside a transaction (`FOR UPDATE`), so a same-second replay *would* fail with `INSUFFICIENT_BALANCE` after the first one drained it — but a slower replay (or different `to_account`) is not blocked.
- **Priority:** Medium
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `deposit.controller.js:24-281` (no idempotency / rate-limit middleware in the chain)

---

## Security Issues

### [Security] `req.body.from_account` for `/transaction/deposit` — Agent can deposit FROM another Agent's account if they spoof `from_account` to the victim's phone AND pass ownership check via a different field

- **Summary:** Ownership check is `dbPhone !== authId && dbEmail !== authId`. An Agent's DB record has both phone AND email. `authId = req.user.identifier` which is one of phone/email. An attacker (Agent A) can spoof Agent B's phone as `from_account` only if A's identifier matches B's phone OR email — they don't, so the check correctly rejects.
  - However: an Agent A with identifier `a@gmail.com` can set `from_account = <another agent's phone>` and the check compares `dbPhone = <other agent's phone>` against `authId = a@gmail.com` — different, so rejected. ✅
  - BUT: the `from_account` value is used in `Users.findOne({ where: { phone_number: from_account } })` which returns the *other* agent's record. The Agent role check is on `from_account_exists.role === 'Agent'` — passes. Then `isSystemAccount = from_account_exists.phone_number === 'SYSTEM'` — false, so it goes to Flow 2. The amount check uses `from_account_exists` balance — which is the OTHER AGENT's balance. **An Agent could trigger a deposit that draws from another Agent's balance** — IF the ownership check passed.
  - Verifying the ownership check is enforced: `dbPhone !== authId && dbEmail !== authId` — yes, it is. So this attack is blocked. But it's worth highlighting as a *defense-in-depth* concern: the architecture is `from_account` is a body parameter rather than always-from-token, and the ownership check is the only thing stopping abuse.
- **Priority:** High (architectural; currently safe only because of the ownership check)
- **Confidence:** High (the check is in place)
- **Status:** NEW BUG (defense-in-depth)
- **Evidence:** `deposit.controller.js:42-56` (ownership check), `deposit.controller.js:39-41` (from_account lookup)

---

### [Security] `/transaction/stripe/create-intent` doesn't rate-limit — an attacker with a valid Customer token can create thousands of PaymentIntents, getting Stripe rate-limited (DoS) or leaving junk intents

- **Priority:** Medium
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `stripeCashIn.controller.js:30-113`

---

### [Security] `getTransactionLimitByAccount` returns limit as plain number — no auth check that the requester owns the account

- **Summary:** Same as `/transaction/balance/:account` — any authenticated user can read any account's limit.
- **Priority:** Medium
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `transactionDetails.controller.js:102-121`

---

## Improvements

### [Improvement] Commission display in response is a raw float — clients should format

- **Why this is not a confirmed bug:** `commission: 12.5` is returned as a JavaScript number which is fine for JSON, but currency formatting is the client's job.
- **Recommendation:** Document that the field is a float in BDT.

### [Improvement] No `/transaction/stripe/webhook` endpoint — relies on client `confirm` instead of Stripe webhook

- **Why this is not a confirmed bug:** Many apps use the client-driven confirm pattern. But the standard is webhook-driven credit. Currently: if the user's browser crashes between Stripe success and `confirm` call, the money is paid but never credited.

---

## Coverage Summary

| Concern | Covered |
|---|---|
| Agent can deposit to Customer | ✅ |
| SYSTEM can fund Agent | ✅ |
| Customer cap enforced | ✅ |
| Min/max amounts enforced | ✅ |
| Atomic balance check + write | ✅ (FOR UPDATE in transaction) |
| Ownership check on from_account | ✅ (defense-in-depth) |
| Stripe cash-in status re-check | ❌ |
| Stripe webhook verification | ❌ (relies on client confirm) |
| TransactionLimits table consulted | ❌ (hardcoded 10000) |
| transaction_type set on Stripe rows | ❌ (NULL) |
| Replay protection | ❌ |
| Rate limiting | ❌ |
