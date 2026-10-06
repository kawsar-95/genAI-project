# SM-H02 Review: Concurrent send-money requests exceed the daily transaction-count limit

| | |
|---|---|
| **Bug** | SM-H02 · [Issue #2](https://github.com/kawsar-95/genAI-project/issues/2) · High |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ✅ **Fixed for Send Money.** ⚠️ The shared limit can still be broken through Payment and Withdraw (follow-up). |

## Requirement
A customer can make at most 10 outgoing transactions (and spend at most 5,000 Tk) per day, even when requests arrive in parallel. With N already used, only 10 − N requests from a parallel burst succeed, and the rest get the daily-limit 400. Source: BRD §8.1, §8.3.

## Fix in this PR
- `checkCustomerLimits(from_account, amt + p2pFee, { transaction: t })` moved inside `sequelize.transaction`, after the `SELECT … FOR UPDATE` balance read: `sendMoney.controller.js:106-109, 119-130`.
- A limit failure throws `LIMIT_EXCEEDED`, which is mapped to 400 with the same `message`/`details` shape as before: `sendMoney.controller.js:184-189`.
- `limitChecker.js:51, 67, 108-113, 126`: the transaction is passed to `TransactionLimit.findAll` and to the `getUsage` query. The parameter defaults to `{}`, so the 2-argument calls in payment and withdraw keep working.

## Assessment
- **Fixed?** Yes, for the reported scenario: parallel SendMoney requests from one account. The fix covers both the count limit and the amount limit.

### Locking analysis
- **No index on `account`.** `Transactions` has only `PRIMARY(id)`. The live DB (`SHOW INDEX`) and `sql_scripts/local-dmoneydb-202604201925.sql:117-130` both confirm this. So `SELECT … WHERE account=? FOR UPDATE` scans the whole clustered index.
- **What the lock does under READ_COMMITTED.**
  - InnoDB locks every row it scans and releases the non-matching ones.
  - `FOR UPDATE` gets no semi-consistent read, so a second request from the same account waits on that account's first row until the holder commits.
  - The new debit row has the highest PK, so the resumed scan reads it too.
  - The limit reads after the lock are plain `SELECT`s. Under RC each one takes a fresh snapshot, so they see the previous holder's committed debit.
  - **Result: same-account requests are serialized.**
- **First-ever send.** An account with no rows has a balance of 0 and is rejected with `INSUFFICIENT_BALANCE`, so there is nothing to race.
- **Deadlock risk: not increased.**
  - All scanners walk the PK in the same order.
  - After the scan the handler runs only non-locking reads and INSERTs.
  - RC uses no gap locks, and there is no unique secondary index.

### Strengths
- The smallest correct change. It reuses the existing lock instead of adding a second locking scheme.
- The response shape is backward compatible, and the change adds no new deadlock risk.
- The manual race test is the right check for this bug: 14 parallel sends gave 10×201 and 4×400, and SQL confirmed `COUNT(DISTINCT trnxId)` = 10.

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| **Important** | `payment.controller.js:72`, `withdraw.controller.js:66` | Payment and Withdraw still call `checkCustomerLimits` before their transaction and without the lock. The limit counts SendMoney, Payment and Withdraw together (`limitChecker.js:21`). A customer at 9/10 who fires one SendMoney and one Payment in parallel can end at 11/10. Payment-vs-Payment and Withdraw-vs-Withdraw races are also still open. | Apply the same move in both controllers: call `checkCustomerLimits(..., { transaction: t })` right after their `FOR UPDATE`, throw `LIMIT_EXCEEDED`, and map it to 400. The helper already supports this. At minimum, file a follow-up issue. |
| Minor | `sendMoney.controller.js:119-122` | The comment explains why the fix works but doesn't say it relies on every competing writer taking the same `FOR UPDATE` before its limit check. | Add one sentence so a later edit doesn't move the check back outside the lock. |
| Minor | `sendMoney.controller.js:125`, `limitChecker.js:52-60` | The critical section is now longer: one `TransactionLimit` read plus `getUsage` aggregate scans, all full-table scans. Because there is no index, all money-moving transactions are in practice serialized across the whole table. Throughput drops under load, and lock-wait timeouts turn into generic 500s. | Add an idempotent migration in `migrations/` that creates `INDEX (account, createdAt)` on `Transactions`. It also narrows the `FOR UPDATE` to one account. Not a blocker at the app's current scale. |
| Minor | `sendMoney.controller.js:93, 112-117` | The order of error responses changed. A request that is over the limit and also short on balance now gets 208 "Insufficient balance" instead of the 400 limit message. A request that is over the limit and below the minimum amount now gets "Minimum amount is 10 tk". | Both orders are reasonable. Document them so tests that assert the old order can be updated. |

## Suggested verification
1. **Count race:** use a customer with 0 sends today and fire 14 sends in parallel:
   ```bash
   for i in $(seq 1 14); do (curl -s -o /dev/null -w "%{http_code}\n" -X POST .../transaction/sendmoney ... \
     -d '{"from_account":"01686606902","to_account":"01686606903","amount":10}' >> codes.txt) & done; wait
   sort codes.txt | uniq -c        # expect 10× 201, 4× 400
   ```
   Then confirm with SQL that `COUNT(DISTINCT trnxId)` for today is 10.
2. **Amount race:** with a 5,000 Tk/day limit, send 3 × 2,000 in parallel. Expect 2×201 and 1×400 "amount limit exceeded".
3. **Mixed-type race** (expected to fail until the Important issue is fixed): at 9/10, fire one SendMoney and one Payment in parallel. The correct result is exactly one 201.

**Already run (2026-10-06, local server):** test 1 gave 10×201 and 4×400. SQL confirmed 10 sends (150 Tk), and one more request afterwards returned 400.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.**
- **Must fix before merge:**
  - SM-M01: the collation bypass of the own-account check.
  - SM-L01: the error message differs from the spec.
- **Follow-up:** the Payment/Withdraw limit race above.
- **Process gaps:** no automated tests, and `endpoints.md` and Swagger have not been updated.
