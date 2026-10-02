# Report — Customer Transaction Limits

**Date:** 2026-10-03
**Scope:** How dMoney caps a Customer's outgoing money per day and per month, where the code enforces it, how the boundaries behave, and the gaps found while reading the code.
**Sources:** `services/limitChecker.js`, `sequelizeModel/TransactionLimit.js`, `migrations/create_transaction_limits.js`, `controllers/transactions/{sendMoney,payment,withdraw}.controller.js`, `controllers/transactions/transactionDetails.controller.js`, `routes/transaction.route.js`, `sequelizeModel/db.js`, `DB SQL/local-dmoneydb-202604201925.sql`, BRD §8 and §11.4 (`dmoney-web-react/README.md`), `qa-findings/02-deposit-bugs.md`, `qa-findings/04-security-vulnerabilities.md`

---

## 1. Summary

The system has two things called "limit". They are separate:

| | **Outgoing transaction limits** | **"Transaction limit" endpoint** |
|---|---|---|
| What it is | Daily and monthly caps on how much a Customer can send out | `GET /transaction/limit/:account` |
| Driven by | `TransactionLimits` table | Hardcoded `10000` |
| Enforced in | SendMoney, Payment, Withdraw | Nothing. It only reports a number |
| Measures | Money going **out** (amount + fee) | Rough deposit headroom for the 10,000 Tk wallet cap |

Most of this report covers the first one. The endpoint is covered in §7.

---

## 2. Configured values

Seeded by `migrations/create_transaction_limits.js` and present in the DB dump (`transactionlimits` rows 1 and 2):

| Role | Period | Max total debit | Max transaction count |
|---|---|---:|---:|
| Customer | daily | 5,000.00 Tk | 10 |
| Customer | monthly | 50,000.00 Tk | 50 |

The values live in the database, so an admin can change them with SQL and no deploy. Setting `is_active = 0` turns a row off. If every row is off, or the table is empty, Customers have no limit at all (`limitChecker.js:108-111`).

### Table: `TransactionLimits`

| Column | Type | Meaning |
|---|---|---|
| `role` | VARCHAR(20) | Role the row applies to. Only `Customer` is ever read |
| `period` | ENUM(`daily`,`monthly`) | Window |
| `max_amount` | DECIMAL(15,2) | Max cumulative debit in the window (fees included) |
| `max_count` | INT | Max number of outgoing transactions in the window |
| `is_active` | TINYINT | 1 = enforced, 0 = ignored |

---

## 3. Who and what is limited

| Flow | Sender role | Limited? | Where |
|---|---|---|---|
| Send Money | Customer → Customer | **Yes** | `sendMoney.controller.js:61` |
| Payment | Customer → Merchant | **Yes** | `payment.controller.js:72` |
| Payment | Agent → Merchant | No | skipped by `if (fromRole === "Customer")` |
| Withdraw (Cash-Out) | Customer → Agent | **Yes** | `withdraw.controller.js:66` |
| Withdraw (Cash-Out) | Merchant → Agent | No | skipped by `if (fromRole === "Customer")` |
| Deposit, Stripe Cash-In, Admin Deposit | any | No | incoming money; the 10,000 Tk wallet cap applies instead |

Limits are cumulative over the window. They do not cap the size of a single transaction.

---

## 4. How the check works

`checkCustomerLimits(customerPhone, totalDebit)` in `services/limitChecker.js:102`:

```
Controller (after auth, same-account and active-status checks)
  │
  ├─ checkCustomerLimits(from_account, amount + fee)
  │     1. Load TransactionLimits WHERE role='Customer' AND is_active=1
  │     2. For each row (daily, monthly):
  │          periodStart = today 00:00 UTC   (daily)
  │                      = 1st of month 00:00 UTC (monthly)
  │          SELECT SUM(debit), COUNT(DISTINCT trnxId) FROM Transactions
  │            WHERE account = phone AND debit > 0
  │              AND transaction_type IN ('SendMoney','Payment','Withdraw')
  │              AND createdAt >= periodStart
  │          if usedCount >= max_count            → BLOCK (count)
  │          if usedAmount + totalDebit > max_amount → BLOCK (amount)
  │     3. All rows pass → allowed
  │
  ├─ blocked → HTTP 400 { message, details }
  ├─ minimum-amount check
  └─ DB transaction: locked balance check + 3 ledger writes
```

### Points to note

- **Fees count.** The value checked is the full debit row: `amount + fee`. The history query sums the `debit` column, which already includes fees, so both sides use the same basis.
- **Only the sender's debit row counts.** The receiver's credit row and the SYSTEM fee row have `debit = 0`, so they are excluded.
- **Count is checked before amount.** When both are exceeded, the count message wins.
- **Only committed rows count.** A transaction that fails (insufficient balance, below minimum) rolls back and uses none of the quota.
- **Legacy rows are excluded.** Rows with `transaction_type = NULL` (from before the migration) are not counted.
- **Payment uses the discounted amount.** With a valid `DISCOUNT_CODE`, the check uses `finalAmount + fee`, not the original amount.
- **Blocked requests return HTTP 400.** Other soft failures in this codebase use 208, such as insufficient balance or the deposit wallet cap.

### Error response

```json
{
  "message": "Daily amount limit exceeded. You can spend at most 2500.00 Tk more (incl. fees) this daily period (limit: 5000 Tk, used: 2500.00 Tk).",
  "details": {
    "period": "daily",
    "usedAmount": 2500,
    "usedCount": 3,
    "maxAmount": 5000,
    "maxCount": 10,
    "remainingAmount": 2500,
    "remainingCount": 7
  }
}
```

When the count is exhausted, the message is: `Daily transaction limit reached. You have used all 10 allowed transactions for this daily period.`

---

## 5. Boundary behaviour

| Rule | Condition | Effect |
|---|---|---|
| Count | `usedCount >= max_count` blocks | The 10th transaction of the day is allowed. The 11th is blocked |
| Amount | `usedAmount + newDebit > max_amount` blocks | Landing exactly on 5,000.00 is allowed. 5,000.01 is blocked |
| Daily reset | `createdAt >= today 00:00 UTC` | Resets at **06:00 Bangladesh time** (UTC+6), not at local midnight |
| Monthly reset | `createdAt >= 1st 00:00 UTC` | Resets at 06:00 BDT on the 1st |

### Worked examples (daily, fresh customer)

Fees from BRD §9: SendMoney is a flat 5 Tk. Payment and Withdraw are 1% with a 5 Tk minimum.

| # | Action | Debit | Used after | Result |
|---|---|---:|---:|---|
| 1 | Send Money 4,995 | 4,995 + 5 = 5,000 | 5,000 | Allowed (equal to the limit) |
| 2 | Send Money 10 | 10 + 5 = 15 | — | **Blocked**, amount (5,015 > 5,000) |
| — | *New day* | | | |
| 3 | Withdraw 4,950 | 4,950 + 49.50 = 4,999.50 | 4,999.50 | Allowed |
| 4 | Send Money 10 | 15 | — | **Blocked**, amount |
| — | *New day* | | | |
| 5 | 10 × Send Money 10 | 15 each | 150, count 10 | All allowed |
| 6 | Send Money 10 | 15 | — | **Blocked**, count (10 ≥ 10) |

**Effect of fees:** the largest single Send Money a Customer can make in one day is **4,995 Tk**, not 5,000. Spread over 10 sends it drops to 4,950 Tk of principal.

**Monthly vs daily:** a Customer who uses the full daily count hits the monthly count (50) after 5 days. A Customer who uses the full daily amount hits the monthly amount (50,000) after 10 days. In practice the monthly row decides only for heavy users.

---

## 6. Gaps and risks found

Status key: **Known** means it is already documented in `qa-findings/`, `CLAUDE.md` or the root README. **New** means it was found while reading the code for this report and should be confirmed before filing.

| # | Finding | Severity | Status |
|---|---|---|---|
| G-1 | **Concurrent requests can bypass the limit.** `checkCustomerLimits` runs *before* `sequelize.transaction(...)` and its usage query takes no lock. Two parallel requests can both read the same usage, both pass, and both commit. The `FOR UPDATE` inside the transaction guards only the balance. Example: usage 4,000; two parallel 900 Tk sends both pass (4,905 ≤ 5,000 each) and the day ends at 5,810. | High | New |
| G-2 | **The daily window resets at 06:00 BDT.** `startOfDay()` uses UTC, and `db.js` sets no `timezone`, so Sequelize stores `createdAt` in UTC. BRD §8.3 does say "00:00 UTC", but users in Bangladesh will expect local midnight. Activity between 00:00 and 06:00 BDT counts toward the *previous* local day. | Medium | New (product decision) |
| G-3 | **`GET /transaction/limit/:account` ignores this table.** It returns `10000 - (Deposit credits - Withdraw debits)`. | High | Known (`02-deposit-bugs.md`, README "Known limitations") |
| G-4 | **The limit endpoint has no ownership check.** Any logged-in user can read any account's value. | High | Known (`04-security-vulnerabilities.md`, IDOR) |
| G-5 | **The limit endpoint's headroom maths is incomplete.** It filters by `description` = `"Deposit"` / `"Withdraw"`, so Stripe cash-ins, sends received, payments and sends made are all ignored. It does not match the real balance that `deposit.controller.js` checks against the 10,000 cap. | Medium | New (beyond G-3) |
| G-6 | **No unique key on `(role, period)` in the live DB.** The migration creates `uq_role_period`, but the dump's `transactionlimits` table has only a primary key. The table was likely created by `sequelize.sync()`, and the model declares no unique index. Duplicate rows can therefore exist, and every active duplicate is enforced, so the strictest one wins without anyone noticing. | Low | New |
| G-7 | **Row order is not deterministic.** `findAll` has no `ORDER BY`. When daily and monthly are both breached, the order the rows come back in decides which message the user sees. | Low | New |
| G-8 | **Only `Customer` is read.** `role = 'Customer'` is hardcoded. A row added for `Agent` or `Merchant` has no effect, which repeats the "looks configurable but isn't" problem from G-3. | Low | New |
| G-9 | **The BRD error text is out of date.** BRD §8.4 shows "You can send at most …". The code says "You can spend at most … (incl. fees)". Tests that assert the exact message will fail against the BRD wording. | Low | New (doc drift) |
| G-10 | **The limit runs before the minimum-amount check.** A 5 Tk send from a Customer who has used up the quota returns the limit error, not "Minimum amount is 10 tk". This is harmless, but tests need to expect that order. | Info | New |

---

## 7. The `GET /transaction/limit/:account` endpoint

- **Route:** `routes/transaction.route.js:16`, `authenticateJWT`
- **Code:** `transactionDetails.controller.js:102-121`
- **Logic:** `10000 - (SUM(credit WHERE description='Deposit') - SUM(debit WHERE description='Withdraw'))`
- **What the BRD says it is (§11.4):** remaining deposit capacity under the 10,000 Tk wallet cap
- **What it is not:** the remaining daily or monthly outgoing limit. `endpoints.md` labels it "Remaining daily limit", which is misleading.

There is currently **no API that tells a Customer how much of the daily or monthly limit is left.** The only place that figure appears is the `details` object in a *rejected* SendMoney, Payment or Withdraw response.

---

## 8. Suggested test scenarios

| ID | Scenario | Expected |
|---|---|---|
| TL-01 | Customer sends 4,995 (debit 5,000) on a fresh day | 201, allowed at exact boundary |
| TL-02 | Then sends 10 Tk | 400, "Daily amount limit exceeded", `remainingAmount: 0` |
| TL-03 | 10 sends of 10 Tk, then an 11th | 11th → 400, "Daily transaction limit reached" |
| TL-04 | Mix SendMoney + Payment + Withdraw toward 5,000 | All three types share one quota |
| TL-05 | Agent → Merchant payment above 5,000 | Not limited |
| TL-06 | Merchant → Agent withdraw above 5,000 | Not limited |
| TL-07 | Deposit / Stripe cash-in after daily limit is used | Not blocked by outgoing limits |
| TL-08 | Insufficient-balance failure, then retry | Failed attempt uses no quota |
| TL-09 | Payment with valid discount code | Check uses discounted amount + fee |
| TL-10 | `UPDATE TransactionLimits SET max_amount=100 WHERE period='daily'` | New cap applies on the next request, with no restart |
| TL-11 | `UPDATE TransactionLimits SET is_active=0` (all rows) | Customer is unlimited |
| TL-12 | Insert a transaction with `createdAt` at 05:59 BDT vs 06:01 BDT (today) | 05:59 counts toward yesterday; 06:01 counts toward today (G-2) |
| TL-13 | Fire 2+ parallel sends that each fit but together exceed the remaining quota | Expected: only those that fit succeed. Actual risk: all succeed (G-1) |
| TL-14 | Exceed daily and monthly together (e.g. lower monthly to 100) | Note which message is returned (G-7) |
| TL-15 | `GET /transaction/limit/<customer>` | Returns the deposit-headroom number, not the outgoing limit (G-3, G-5) |

### Handy SQL

```sql
-- Current daily usage for a customer (same filter as limitChecker)
SELECT COALESCE(SUM(debit),0) AS usedAmount, COUNT(DISTINCT trnxId) AS usedCount
FROM Transactions
WHERE account = '01686606902'
  AND debit > 0
  AND transaction_type IN ('SendMoney','Payment','Withdraw')
  AND createdAt >= UTC_DATE();

-- Inspect / change limits
SELECT * FROM TransactionLimits;
UPDATE TransactionLimits SET max_amount = 100 WHERE role='Customer' AND period='daily';
```
