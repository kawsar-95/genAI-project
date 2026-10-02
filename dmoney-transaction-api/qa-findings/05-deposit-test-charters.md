# Exploratory Test Charters — Deposit / Cash-In

**Target:** Deposit / Cash-In module — Agent → Customer, SYSTEM → Agent, Admin → SYSTEM, Customer Stripe cash-in (API + web UI).
**Charters:** 6 (4 High, 2 Med), about 7 h of session time in total.
**Highest risk:** Stripe `confirm` can credit a wallet twice or past the 10,000 BDT cap, because the idempotency check, the cap re-check and the ledger writes are not atomic.

**Sources:** `controllers/transactions/{deposit,adminDeposit,stripeCashIn}.controller.js`, `sequelizeModel/{Transactions,Commission}.js`, `dmoney-web-react/README.md` (BRD §7.1, §7.5, §7.6), `dmoney-web-react/src/app/{agent/cash-in,customer/cash-in-bank,admin/deposit}/page.tsx`, `qa-findings/02-deposit-bugs.md`, `qa-findings/03-deposit-test-cases.md` (AC-1..AC-10).

> Charters only. No session has been run yet. "Leads" are things in the code worth probing, not confirmed bugs.

## Charter Index

| ID | Title | Priority | Time-box | Risk covered |
|---|---|---|---|---|
| CH-1 | Stripe cash-in confirm integrity | High | 90 min | R1: double credit, cap breach or suspended user credited through `confirm` |
| CH-2 | Agent → Customer money and ledger correctness | High | 90 min | R2: wrong commission, rounding drift, cap boundary, unbalanced ledger |
| CH-3 | Concurrency and replay on deposit endpoints | High | 60 min | R3: overdraw or cap breach under parallel requests |
| CH-4 | Role and ownership matrix across all deposit endpoints | High | 60 min | R4: wrong role or wrong owner moves money |
| CH-5 | Input coercion, validation and error contract | Med | 60 min | R5: odd inputs get past `Number()`; 208/500 responses leak or mislead |
| CH-6 | Cash-in UI flows (Agent, Customer wizard, Admin) | Med | 60 min | R6: UI doesn't match the server, broken wizard recovery, bad receipts |

## Risk List

| ID | Risk | Who gets hurt | Impact × Likelihood |
|---|---|---|---|
| R1 | `confirmCashIn` does find-then-create without a DB transaction or lock (`stripeCashIn.controller.js:160-192`). It doesn't re-check the wallet cap or account status, and it debits SYSTEM without checking its balance | Platform (money minted), compliance | High |
| R2 | Commission and amounts are stored as `DOUBLE`. Commission rate falls back with `\|\| 0.025`, so a configured 0 becomes 2.5% (`deposit.controller.js:35`). `maxTxnAmount` is used both as the per-txn max and as the wallet cap | Agent and customer balances, audit | High |
| R3 | `FOR UPDATE` on a `SUM()` over ledger rows. Whether it really serialises concurrent first-time accounts is untested | Agent and SYSTEM float | High |
| R4 | `from_account` is taken from the request body. The SYSTEM ownership check ignores case but the admin check is case-sensitive | All wallets | High |
| R5 | `Number()` coercion (hex, arrays, whitespace). `adminDeposit` has no `isFinite` check. Business errors return 208, and 500s return `err.message` | Admin/SYSTEM pool, API consumers | Med |
| R6 | Client-side min is 1 but the server min is 10. `from_account` comes from `localStorage`. A Stripe success can be followed by a failed `confirm` with no webhook | Agents, customers (paid but not credited) | Med |

---

### CH-1: Stripe cash-in confirm integrity   · Priority: High · Time-box: 90 min

**Mission:** Explore `POST /transaction/stripe/create-intent` → Stripe.js → `POST /transaction/stripe/confirm` with Stripe test cards, a parallel HTTP client and direct DB queries to discover whether one card payment can credit a wallet twice, past the cap, or while the account is suspended.

**Why (risk):** R1. A customer can gain balance that SYSTEM never actually received, or a suspended account can receive funds.

**Areas / Entry points:**
- `POST /transaction/stripe/create-intent`, `POST /transaction/stripe/confirm`
- `/customer/cash-in-bank` (3-step wizard)
- `Transactions` rows where `trnxId = pi_...`

**Ideas to try:**
- Send the same `paymentIntentId` to `confirm` 5–10 times in parallel. Count the rows per `trnxId` (expect exactly 2).
- Create intent A (9,000) and intent B (9,000) while the balance is 0. Pay both, confirm both. Does the wallet end up above 10,000?
- Create an intent, then receive an Agent deposit that brings the wallet to the cap, then confirm. Is the cap enforced at confirm time?
- Create an intent, have the Admin suspend the customer, then pay and confirm (bug 02 claims this goes through; re-verify).
- Confirm a PI in `requires_payment_method`, `processing`, `canceled` or `requires_action` (3DS card `4000 0025 0000 3155`) state.
- Confirm customer A's PI using customer B's token. Confirm a PI ID that doesn't exist or is malformed (`pi_x`, `""`, `{}`).
- Drain SYSTEM's balance close to 0, then confirm. Does SYSTEM go negative?
- Pay on Stripe, close the tab before `confirm` runs. Is there any recovery path?

**Oracles:** Exactly 2 ledger rows per PI ID. Customer Δbalance == `pi.amount/100`. SYSTEM credits minus debits stays ≥ 0. Wallet ≤ 10,000 (BRD §7.5 rule 4–5). Suspended account → 403 (AC-10). Wrong owner → 403.

**Setup & Data:** Customer1 `01686606902` with a low balance, Customer2 `01686606903`, Admin. `STRIPE_SECRET_KEY` (test mode) + frontend publishable key. Stripe dashboard access. A parallel runner (`xargs -P`, k6 or Postman runner). MySQL client.

**Out of scope:** Stripe's own card validation. Agent deposit flow. UI look and feel.

**Traceability:** AC-9, AC-10, BRD §7.5. Bugs 02: "confirmCashIn status", "metadata trust", "No Stripe webhook". `stripeCashIn.controller.js:125-200`.

---

### CH-2: Agent → Customer money and ledger correctness   · Priority: High · Time-box: 90 min

**Mission:** Explore `POST /transaction/deposit` (Flow 1 SYSTEM→Agent and Flow 2 Agent→Customer) with boundary amounts, `Commission` table edits and ledger SQL to discover commission, rounding, cap or ledger-balance errors.

**Why (risk):** R2. The agent is under- or over-paid, the customer cap is wrong at the edge, or the ledger doesn't balance per `trnxId`.

**Areas / Entry points:**
- `POST /transaction/deposit`, `GET /transaction/balance/:account`, `GET /transaction/statement/:account`, `GET /transaction/limit/:account`
- `Commission` rows where `transaction_type='Deposit'`

**Ideas to try:**
- Amounts 9.99, 10, 10.01, 9,999.99, 10,000, 10,000.01. Then 10.005 and 33.33 to check commission precision (0.250125? 0.83325?).
- Customer at 9,999.99 → deposit 10 (expect a 208 with "max 0.01"). Customer at exactly 10,000.00 → deposit 10.
- 50 deposits of 0.1-heavy amounts (e.g. 10.10). Does `SUM(credit)-SUM(debit)` drift from the expected decimal total?
- Agent balance == amount exactly. Agent balance == amount − 0.01.
- Set the Agent `rate` to 0 → is commission 0 or 2.5%? Set `max_txn_amount` to 5,000 → does the customer wallet cap also drop to 5,000?
- Deactivate the Deposit rule (`is_active=false`) → what min/max and rate apply?
- SYSTEM → Agent above 10,000. SYSTEM → Agent with exactly SYSTEM's balance. SYSTEM → SYSTEM. SYSTEM → Customer.
- Compare `currentBalance` in the 201 response with a fresh `GET /balance`, and `/limit/:account` with the real remaining cap.

**Oracles:** Agent Δ = −(amt − 0.025·amt). Customer Δ = +amt (BRD §7.1). Each `trnxId` has exactly 2 rows with matching from/to. `/limit` == 10,000 − balance. Commission rounded to 2 dp (question Q4). Matches AC-1..AC-6.

**Setup & Data:** Agent `01686606901`, Customer1/Customer2, SYSTEM login. Write access to `Commission` (restore it afterwards). A SQL snippet for per-`trnxId` balance checks.

**Out of scope:** Concurrency (CH-3). Authorisation (CH-4). Stripe.

**Traceability:** AC-1..AC-6, BRD §7.1. Bugs 02: "commission row", "limit hardcoded 10000". `deposit.controller.js:35-37, 170-241`.

---

### CH-3: Concurrency and replay on deposit endpoints   · Priority: High · Time-box: 60 min

**Mission:** Explore `POST /transaction/deposit` and `/adminDeposit` with burst and parallel request tools to discover overdraw, cap breach or duplicate ledger rows under concurrent load.

**Why (risk):** R3. An Agent or SYSTEM float goes negative, or a customer ends up above 10,000.

**Areas / Entry points:** `POST /transaction/deposit` (both flows), `POST /transaction/adminDeposit`.

**Ideas to try:**
- Agent with 1,000 balance: 10 parallel deposits of 500 to different customers. How many succeed?
- Two Agents depositing 6,000 each in parallel to one customer at 0.
- A brand-new Agent (no ledger rows, so `FOR UPDATE` locks nothing) gets 20 parallel SYSTEM top-ups plus deposits.
- Replay one captured deposit request 5 times, both fast and spaced out. Every replay produces a new `trnxId`?
- Check `generateTrnxId` for collisions under a burst (`GROUP BY trnxId HAVING COUNT(*)>2`).

**Oracles:** No account other than Admin has balance < 0. Customer ≤ 10,000. Each successful response matches exactly 2 rows. No deadlock surfaces as a 500 to the client.

**Setup & Data:** A fresh Agent and Customer created via Admin. JWTs ready. `k6`, `ab` or `xargs -P 20 curl`. MySQL `SHOW ENGINE INNODB STATUS` for deadlocks.

**Out of scope:** Stripe concurrency (CH-1). Performance benchmarking.

**Traceability:** AC-3, AC-5. Bug 02: "No rate-limit / idempotency". TC-022 in 03.

---

### CH-4: Role and ownership matrix across all deposit endpoints   · Priority: High · Time-box: 60 min

**Mission:** Explore the 4 deposit endpoints with tokens for every role (Admin, SYSTEM, Agent, Customer, Merchant, suspended) and tampered `from_account` / `to_account` values to discover any path where the wrong actor moves money.

**Why (risk):** R4. Funds are drawn from an account the caller doesn't own, or a role does something the permission matrix (BRD §4) forbids.

**Areas / Entry points:** `/transaction/deposit`, `/adminDeposit`, `/stripe/create-intent`, `/stripe/confirm`. `jwtMiddleware.js`.

**Ideas to try:**
- Build a matrix: each role token × each endpoint × `from_account` = self / other user / SYSTEM.
- Agent sets `from_account` to another Agent's phone or email. Customer calls `/deposit` with their own phone.
- SYSTEM logs in as `system` vs `SYSTEM`. Admin sends `from_account` in a different email case (the admin check is case-sensitive).
- `to_account` = Merchant, Admin, a suspended customer, a pending customer, `SYSTEM`, `system`.
- Agent or Merchant calls `create-intent`. Admin calls `/deposit`.
- Missing, expired or other-env JWT. Missing or wrong `X-AUTH-SECRET-KEY`.
- A user's token still used after the Admin changes that user's role.

**Oracles:** Matches the BRD §4 permission matrix. Non-owner → 403, never 201. Rejected requests write no ledger rows. Role errors use a consistent status (403 vs 400; see Q3).

**Setup & Data:** One active account per role plus one suspended Agent and one suspended Customer. A token table. Postman collection or curl script.

**Out of scope:** JWT cryptography. Login/OTP flow (see 01-login-auth-bugs).

**Traceability:** AC-8, AC-10, BRD §4 permission matrix. Bug 02: "from_account from body". 04-security-vulnerabilities.

---

### CH-5: Input coercion, validation and error contract   · Priority: Med · Time-box: 60 min

**Mission:** Explore the request bodies of `/deposit`, `/adminDeposit` and `/stripe/create-intent` with type-confusion and boundary payloads to discover inputs that get past `Number()` validation, and error responses that leak internals or mislead clients.

**Why (risk):** R5. Admin can mint `Infinity` or absurd amounts into SYSTEM. Clients treat a 208 as success. Stack details leak.

**Areas / Entry points:** The 3 POST bodies above. Error branches returning 208 and 500 with `error: err.message`.

**Ideas to try:**
- `amount`: `"0x1F4"`, `" 500 "`, `[500]`, `true`, `"1e3"`, `"Infinity"`, `1e308`, `-0`, `null`, `"5,000"`, `500.999999`.
- `adminDeposit` with `"Infinity"` and `1e309`: what gets stored in the `DOUBLE` column?
- Stripe `create-intent` with 10.005 (`Math.round(amt*100)` = 1001 → credit 10.01?).
- `from_account` / `to_account`: `+8801686606902`, leading or trailing spaces, `null`, an object, a 1,000-char string, `' OR 1=1 --`.
- Missing body. `Content-Type: text/plain`. Extra fields (`commission: 0`, `trnxId`).
- Force a 500 (stop the DB mid-request). What shows up in the `error` field?

**Oracles:** Any non-finite or non-numeric amount → 400. No row has a non-finite debit or credit. 500 responses carry no SQL or stack text. Business rejections return a 4xx (or the documented 208, see Q3) and write no rows.

**Setup & Data:** Agent, Admin and Customer tokens. A payload list file. DB access for verification.

**Out of scope:** Role rules (CH-4). UI-side validation (CH-6).

**Traceability:** BRD §7.1 pre-conditions 6, §7.6, "Error Handling & HTTP Status Codes". `adminDeposit.controller.js:50`.

---

### CH-6: Cash-in UI flows (Agent, Customer wizard, Admin)   · Priority: Med · Time-box: 60 min

**Mission:** Explore `/agent/cash-in`, `/customer/cash-in-bank` and `/admin/deposit` with interrupted flows, Stripe test cards, DevTools and a mobile viewport to discover mismatches between UI and server, unrecoverable states and wrong receipts.

**Why (risk):** R6. A customer pays but sees no credit. An agent gets confusing errors. Receipts show the wrong amount or balance.

**Areas / Entry points:** The three pages, `localStorage.phoneNumber`, and the Stripe `CardElement`.

**Ideas to try:**
- Agent page: enter 5 (the client allows ≥ 1, the server needs ≥ 10). Is the server's 208 message shown, or does the UI report success?
- Edit `localStorage.phoneNumber` to another agent's number, then submit.
- Double-click submit. Press Enter twice. Submit, then refresh while the request is pending.
- Wizard: go back from step 2 to change the amount. Does a stale `clientSecret` get reused? Refresh on step 2 or step 3.
- Cards: decline `4000 0000 0000 0002`, insufficient funds `4000 0000 0000 9995`, 3DS `4000 0025 0000 3155` (fail the challenge).
- Receipt amount and balance vs the DB, and vs the server's `amount` (e.g. after entering 10.005).
- Session expiry mid-wizard. 375 px viewport. Keyboard-only path through the card form.

**Oracles:** UI message == server message. Receipt values == DB. No success screen without 2 ledger rows. Every error state offers a recovery action.

**Setup & Data:** Frontend at `localhost:3000`. Agent, Customer and Admin logins. Stripe test mode. Browser DevTools (Network and Application tabs).

**Out of scope:** Server-side concurrency. Visual design review. Legacy `dmoney-reactjs/Deposit.js`.

**Traceability:** AC-1, AC-9, BRD §7.5 wizard table. Bug 02: "No Stripe webhook".

---

## Session Report Template

Copy once per charter run.

```markdown
## Session Report — CH-<n>

| Field | Value |
|---|---|
| Tester | <name> |
| Date / Start | <yyyy-mm-dd hh:mm> |
| Duration | <actual> vs <time-box> |
| Build / Env | <api commit, web commit, localhost:5000 / :3000, dmoneydb snapshot> |
| Charter vs Opportunity | <e.g. 80 / 20 %> |
| Time split (T/B/S) | Test <x>% · Bug investigation <y>% · Setup <z>% |

**Areas covered:** <list>
**Test notes:** <terse bullets: tried / observed / oddities>

**Bugs:**
| ID | Title | Severity | Steps (short) | Evidence |
|---|---|---|---|---|

**Issues / Blockers:** <env, data, access, questions>
**New charter ideas:** <follow-ups>

**Debrief (PROOF):**
- Past: <what happened>
- Results: <what was found>
- Obstacles: <what got in the way>
- Outlook: <what still needs testing>
- Feelings: <confidence High/Med/Low and why>
```

## Open Questions

1. Is using `maxTxnAmount` as both the per-transaction max and the customer wallet cap intended, or should the cap be a separate setting?
2. Should a Stripe cash-in count toward the customer's daily or monthly limits, and should it carry a fee or commission?
3. Business-rule rejections (insufficient balance, cap exceeded) return **208**. Is that the agreed contract, or should they be 4xx?
4. What is the rounding policy for commission and amounts (2 dp, half-up)? Are amounts with more than 2 decimal places allowed?
5. Is a configured Agent commission rate of 0 a valid setting? The code currently falls back to 2.5%.
6. Should SYSTEM → Agent top-ups have a per-agent daily cap?
7. Is the Admin account balance going negative by design for `adminDeposit`? Should `adminDeposit` have an upper bound?
8. What is the expected recovery when Stripe charges the card but `confirm` never runs (closed tab or network drop)?
