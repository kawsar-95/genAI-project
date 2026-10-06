# PR #8 — Review record

This is the internal companion to [PR-8.test.md](PR-8.test.md).

- **Code reviewed:** `fix/send-money-bugs` at `3a6456e` (PR #8, open, not merged).
  - Code facts are labelled with that SHA. They aren't confirmed to ship, because the branch could still be rebased or squashed.
  - The implementation is readable through `git show`, so the "implementation available" approach applies.
- **Bug hunt:** `find-bug` hasn't run against this PR. Every case's `Any Issue?` field therefore reads `N/A — bug hunt not yet run`.
- **Bug candidates:** the suspected defects are recorded in E7. They are not in a `.bug.md` file.

## E1. Case evidence map

Code citations are at `3a6456e` unless stated. `ctrl` means `dmoney-transaction-api/controllers/transactions/sendMoney.controller.js`, `lc` means `services/limitChecker.js` (in `dmoney-transaction-api`), and `page` means `dmoney-web-react/src/app/customer/send-money/page.tsx`.

| Case | Covers | Evidence |
|---|---|---|
| Basic Test | End to end | `dmoney-web-react/src/app/login/page.tsx:51-54,100 (redirect to /profile),152-153` (env=dev, API URL fallback `:3000`, key `ROADTOSDET`), `:238,244,274,284,318,372,405` (labels); `LeftMenu.tsx:55,58`; page `:122`, receipt block `:183-207` (CSS `textTransform: 'uppercase'`); `components/SelfStatement.tsx:253,257` |
| TC-001 | AC-1–5 | ctrl `:14-23` (outer try/catch), `:31-36` (guards and messages); `routes/default.route.js:5` (`GET /`); issue #1 |
| TC-002 | AC-6, 7, 8, 11 | ctrl `:119-130,184-189`; lc `:142-149` (count message format); DB `TransactionLimits` daily `max_count=10` (read-only query, 2026-10-07); live run 2026-10-06 (10×201 / 4×400) |
| TC-003 | AC-8, 9 | lc `:152-160` (amount message: `remainingAmount.toFixed(2)`, `${maxAmount}`, `usedAmount.toFixed(2)`); DB daily `max_amount=5000.00`; Commission SendMoney flat `rate=5` |
| TC-004 | AC-8, 10 | lc `:110-113` (only active rows are loaded), `:142-149`; DB monthly `max_count=50`; BRD §8 ("DB-driven … changed without a code deployment") |
| TC-005 | AC-12 | lc `:21` (OUTGOING_TYPES); `payment.controller.js:71-79` and `withdraw.controller.js:65-73` (limit check outside the lock); review `SM-H02_review.md` (Important) |
| TC-006 | BRD §7.3 precondition 7, §8.3 | ctrl `:106-117` (balance check; the transaction opens at `:102`) comes before `:119-130` (limit check); BRD §8.3 says limits are "called before the balance check" — conflict, see E2 |
| TC-007 | AC-13, 14, 15, 16, 17 | page `:57,89` (trimmed receiver), `:105` (shows the API message); ctrl `:39-40,75-76`; ZWSP DB match verified read-only on 2026-10-07 |
| TC-008 | AC-13–18 | ctrl `:39-40` (`trim()`), `:75-76` (`===`); `String.prototype.trim` keeps U+200B (node check, 2026-10-07); `utf8mb4_unicode_ci` (repo-root `sql_scripts/local-dmoneydb-202604201925.sql` L155); full-width lookup also returns 1 row (read-only, advocate pass); sender side ctrl `:67-69` |
| TC-009 | AC-19, 20 | ctrl `:39-40` (trimmed value used for the lookup and the ledger rows `:132-166`, account fields `:133,143`); page `:89` |
| TC-010 | AC-21, 23 | page `:67-71` (pattern and message), `noValidate` `:130` |
| TC-011 | AC-22, 23 | ctrl `:12,42-45`; message TBD (Q-5) |
| TC-012 | AC-25 | ctrl `:12,42-48` (2 decimals pass), `:132-166` (debit `:138`, credit `:149`); Commission flat 5; `getBalance` rounds to 2 places (`services/getBalance.js:9`) |
| TC-013 | BRD §7.3 precondition 5 | ctrl `:93-94` (`Minimum amount is ${minAmount} tk`); DB Commission SendMoney `min_txn_amount=10.00` |
| TC-014 | AC-26–30 | ctrl `:42-45` (type and pattern check; the message deviates from the AC text), `:47-48` (`0` gets the short message); unquoted JSON `1e1` → number 10 passes (node check, advocate pass); issue #5 expected result |
| TC-015 | AC-31 | ctrl `:42-45` (accepts `number` or `string`; `String(amount).trim()`); BRD §7.3 sample body `amount: 200` |
| TC-016 | AC-24, 32–35 | page receipt block `:183-207` (Amount Sent / Service Fee / Total Amount = `sentAmount + (serviceFee ?? 0)` / Remaining Balance); ctrl `:170-174` (`fee`, `currentBalance`) |
| TC-017 | AC-36–40 | ctrl `:31-36`; `app.js:10` (`urlencoded({ extended: true })`); ctrl `:21,191` (generic 500 without `error`) |
| TC-018 | Related regression: restructured handler | ctrl `:80-84` (inactive), `:178-181` (208), `:195` (role), `:199-201` (404); Users: Agent `01686606901` active, `01786606901` pending (read-only, advocate pass) |
| TC-019 | Authorization regression | ctrl `:67-73` (ownership on the canonical DB values); `jwtMiddleware.js:31` (401 "No Token Found!") |
| TC-020 | Caller group: Payment (Customer) | `payment.controller.js:64,66-79,146,157`; Merchant `01686606905` active (`01786606905` pending); Commission Payment SYSTEM 1% with `min_fee 5` |
| TC-021 | Caller group: Withdraw (Customer) | `withdraw.controller.js:26,57-73,142-143`; Commission Withdraw SYSTEM 1% with `min_fee 5` |
| TC-022 | Caller group: Agent/Merchant (exempt) | `payment.controller.js:71` and `withdraw.controller.js:65` (`if (fromRole === "Customer")`); Merchant balance 212.25 (read-only), so it is funded by the step-1 agent payments |
| TC-023 | Lock contention regression | ctrl `:106-109` (FOR UPDATE); ledger rules: `withdraw.controller.js:110,121,131` (Cash Out credits exceed the debit by the agent commission), `:119-130` (more work inside the lock); `PR-8_blast-radius.md` DB fan-out (4 → 7 statements in the lock); `SHOW INDEX` (PK only) |

## E2. Evidence Gaps / Conflicts

- **Limit check vs balance check order (TC-006).**
  - BRD §7.3 precondition 7 and §8.3 say limits are checked first. The code at `3a6456e` checks the balance first.
  - Sources checked: the BRD and ctrl `:102-130`.
  - Decision: the expected result follows the BRD, which ranks higher in the source order, with an inline conflict note. The business still has to decide (Q-2).
- **Decimal rule (TC-010 to TC-012).** The BRD has no decimal-places rule, and BRD §4.2 lists `debit` as INTEGER while the live column is DOUBLE. The cases are marked provisional through the ACs (Q-1).
- **Message for too many decimals (TC-011).** Neither the issue nor the BRD specifies it, so the expected message is TBD (Q-5).
- **Exact invalid-amount message (TC-014).** The issue's expected result says exactly "Amount must be a valid number greater than 0", but the code returns a longer message. This is designed as the issue states, and recorded as candidate BC-3.
- **Amounts padded with spaces, `" 20 "` (TC-015).** The requirement is silent and the code accepts it. Marked TBD (Q-4).
- **Receipt meaning (TC-016).** The BRD doesn't define the receipt. Marked provisional (Q-3).
- **Limit message wording (TC-003).** BRD §8.4's sample says "You can **send** at most 2500.00 Tk more this daily period (limit…)" with no "(incl. fees)". The code (lc `:155-157`) says "You can spend at most … Tk more (incl. fees) …". This predates PR #8. TC-003 uses the code's wording, labelled as code-derived.
- **Payment ledger (TC-023).** BRD §7.4 credits the Merchant the amount plus commission, but the code credits only the amount. This is outside PR #8. TC-023 now asserts the ledger balance for Send Money only.
- **No endpoint for current usage.** `GET /transaction/limit/:account` is hard-coded (known gap), so testers count the usage from the statement or with an approved DB check.

**Open questions**
- **Q-1:** Must amounts have at most 2 decimals? Should more be rejected or rounded? Blocks TC-010, TC-011, TC-012.
- **Q-2:** Which message wins when a request is over the limit and also short of balance? Blocks TC-006.
- **Q-3:** Does "Total Amount" mean the amount sent or the amount debited? Blocks TC-016.
- **Q-4:** Are numeric strings with surrounding spaces valid amounts? Blocks TC-015 (one variant).
- **Q-5:** What exact message should too many decimals get? Blocks TC-011.

## E3. Assumptions

| Assumption | Based on | Confidence | Cases | Would be disproved by |
|---|---|---|---|---|
| Only one limit trips in each of TC-003 and TC-004, so the order of the daily and monthly rows doesn't matter | The headroom preconditions in both cases | High | TC-003, TC-004 | Both limits tripping in one request |
| The statement view shows the stored account value | `SelfStatement.tsx` columns | Medium | TC-009 | Spaces aren't visible, in which case use the DB check named in the case |
| The fee for a 100 Tk Payment or Withdraw is 5 Tk | Commission 1% with `min_fee 5` → max(1, 5) | High | TC-020, TC-021, TC-022 | A different live rule |

## E4. Caller-trace record

- **Searches run:**
  - `grep -rnE "require\(.*sendMoney.controller"`: 1 hit, `routes/transaction.route.js:6`.
  - `grep -rnE "require\(.*limitChecker"`: 3 real hits (sendMoney, payment, withdraw) plus 1 comment hit in limitChecker `:11`, which was dropped.
  - `grep -rn "/transaction/sendmoney"` in the web code and the Postman collection: page `:88` and collection `:409`.
  - `grep -rnE "API\.post\(.*/transaction/(payment|withdraw)"`: 4 pages (customer payment and cash-out, agent payment, merchant cash-out).
- **Grouping:**
  - Send Money: page + API.
  - Customer outgoing flows that share the limit: Payment and Withdraw.
  - Non-customer flows that use the same endpoints: Agent payment and Merchant cash-out.
- **Read in full:** sendMoney (HEAD and BASE), limitChecker (HEAD), and the limit and role sections of payment and withdraw. **Sampled:** the four other pages, call lines only.
- **Not read:** deposit, adminDeposit and stripe. They don't import the changed modules.

## E5. Impact matrix (materially affected rows)

| Flow / artifact | Entry point | Changed behaviour | Variants | Observable outcome | Validation/auth | Related regression | Existing coverage | Evidence |
|---|---|---|---|---|---|---|---|---|
| Send Money | `POST /transaction/sendmoney`, `/customer/send-money` | Guards, trimming, amount pattern, limit inside the lock, generic 500, receipt | missing/typed accounts, look-alike numbers, amount formats, parallel | 400/201/208/403/404, receipt values | TC-001, 014, 017, 019 | TC-018 | none automated (`tests/` has only email scripts) | Strong |
| Customer limit | shared limit service via 3 endpoints | Runs inside the transaction for Send Money only | parallel, mixed types, check order | 400 + `details` | n/a | TC-020, 021, 022 | `transaction-limits.report.md` (manual) | Strong |
| Concurrency / lock | all money-moving endpoints | Lock held longer | mixed parallel | no 500s; balanced ledger | n/a | TC-023 | none | Medium (no perf target) |

## E6. Deliberate exclusions

- **AC-41 (generic 500 on internal failure):** dropped. It needs a forced database or infrastructure failure, which has no supported path (A8).
- **Monthly 50,000 Tk amount under concurrency:** dropped. It needs at least 45,000 Tk of spend in one month with a 10,000 Tk wallet cap; impractical in sanity scope.
- **A burst across 00:00 UTC:** dropped. It's time-dependent and not repeatable, and is covered by charter CH-1.
- **A separate case for each look-alike character:** merged into TC-007 and TC-008. They are the same action and the same expected outcome.
- **The Postman collection request:** dropped. It's covered by TC-012 and TC-015 (a JSON number amount).
- **The other four receipt pages:** dropped. They're unchanged and out of PR scope.
- **Switching off the daily limit to test the monthly limit (old TC-004 setup):** dropped. There is no admin path, only a direct database write that would affect every customer. It was replaced by a customer who reached 49 transactions over earlier days.
- **Repeating a 2-request race 5 times (advocate suggestion for TC-005):** replaced by one 12-request mixed burst from 0, which gives the race 12 chances in a single run.
- **White-box cases for the transaction argument of `checkCustomerLimits`:** dropped. TC-002 to TC-005 observe the behaviour through the system.

## E7. Bug candidates

**BC-1 — Mixed SendMoney + Payment/Withdraw requests can still exceed the shared limit (TC-005)**
- **Case for:** Payment `:72` and Withdraw `:66` check the limit before their transaction and without the lock. lc `:21` counts all three types together, and BRD §8.2 says the limit is cumulative. Read, not run.
- **Case against:** issue #2 only reports Send Money, so the PR's scope may legitimately be Send Money only. The cross-type race could also have existed before the PR.
- **What would settle it:** run TC-005 at 9/10. Two 201s means the limit was exceeded.
- **Verdict:** Open.
- **Decided by:** pending a `find-bug` or TC-005 execution.

**BC-2 — The own-account check can be bypassed with a zero-width space or a full-width digit (TC-007, TC-008)**
- **Case for:** `trim()` keeps U+200B (node check). MySQL `utf8mb4_unicode_ci` matches `'01686606903​'` to the user (read-only query, 2026-10-07, count = 1). `===` at ctrl `:75` then compares different strings.
- **Also:** the same gap applies on the sender side. A `from_account` with a zero-width space passes the ownership check (ctrl `:67-69` compares the stored record) and the `===` check, and the debit row is stored under the look-alike spelling. The full-width lookup also returns 1 row (advocate pass).
- **Case against:** the receiver lookup resolves the same user, so the transfer may be self-to-self with only the fee lost (a Medium impact). The input needs deliberate pasting.
- **What would settle it:** run TC-008 with the U+200B variant. A 201 confirms the bypass.
- **Verdict:** Open. The evidence is strong, but the request hasn't been executed yet.
- **Decided by:** pending.

**BC-3 — The invalid-amount message differs from the issue's expected text (TC-014)**
- **Case for:** issue #5 expects exactly "Amount must be a valid number greater than 0". ctrl `:44` returns "… with at most 2 decimal places", and `:48` still returns the old text for `0`.
- **Case against:** the issue's message may be illustrative rather than a contract, and a more informative message is arguably better.
- **What would settle it:** a business answer on whether the message is a contract (as it is in Payment, Withdraw and Deposit).
- **Verdict:** Open.
- **Decided by:** the business.

**BC-4 — Check order deviates from the BRD (TC-006)**
- **Case for:** BRD §7.3 precondition 7 and §8.3 say limits are checked first. The code at `3a6456e` checks the balance first.
- **Case against:** the order is an implementation detail, and both outcomes reject the request without moving money. (The order is not forced by the lock: inside the lock, the limit check at `:125` could run before the balance check at `:112`.)
- **What would settle it:** a business answer (Q-2).
- **Verdict:** Open.
- **Decided by:** the business.

**BC-5 — An unquoted JSON `1e1` is accepted as an amount (TC-014)**
- **Case for:** AC-27 (SM-L01 AC-2) says scientific notation is rejected. The raw body `"amount":1e1` is parsed by JSON into the number 10, which passes the format check and moves 10 Tk (node check, advocate pass).
- **Case against:** issue #5 only covers the *string* `"1e1"`. JSON parsing turns the literal into 10 before the application sees it, so the application can't distinguish `1e1` from `10` without reading the raw body. Rejecting it may be unreasonable.
- **What would settle it:** a business ruling on whether the scientific-notation rule applies to JSON number literals.
- **Verdict:** Open (likely Not a bug).
- **Decided by:** the business.

## E8. Review outcome

### Pass 1 — `qa-agent-advocate`, Test Case Review mode, 2026-10-07 · Gate: BLOCKED → corrections applied

**Re-verified independently** (read-only: `git show 3a6456e`, read-only SQL, `node -e`)
- All messages and status codes, and the TC-003 arithmetic.
- The fees: Send Money flat 5; Payment and Withdraw 1% with a minimum of 5, so 100 Tk costs 105.
- The limits: 5000/10 daily and 50000/50 monthly.
- The UI labels: login, menu, Send Money page and statement.
- The 401 "No Token Found!", the body parser `extended: true`, and the look-alike phone lookups (zero-width space and full-width digit both match).

**Confirmed and fixed**
- **TC-023:** the expected ledger balance for every transaction ID was wrong, because Cash Out credits exceed the debit by design. It's now limited to Send Money IDs.
- **TC-004:** the setup needed a database write. It now uses a customer who reached 49 over earlier days, with at most 7 today.
- **Pending accounts:** `01786606901` and `01786606905` are pending. TC-005, TC-018, TC-020, TC-021 and TC-022 now name the active `01686606901` and `01686606905`.
- **Headroom preconditions:** monthly and daily headroom added to TC-002, TC-003 and TC-005. TC-018 now requires the sender to be below the daily limit, which removes its conflict with TC-006.
- **Balance and quota preconditions:** raised in TC-001, TC-003 (6,100), TC-008, TC-009 and TC-023.
- **TC-005:** redesigned as a 12-request mixed burst from 0, so one run gives the race a real chance to show.
- **TC-008:** added the sender-side look-alike. **TC-014:** added `0` and an unquoted `1e1`. **TC-016:** added the receiver credit check for AC-24.
- **Basic Test:** step 3 now says the Profile page opens; a balance check for Customer 1 was added (step 8).
- **TC-011:** the TBD was reworded to "requirement silent; code message stated". **TC-012:** compare balances to 2 decimals. **TC-013:** retitled.
- **TC-003:** the message is labelled as code-derived, and the BRD §8.4 wording conflict was added to E2.
- **Technical file names:** removed from the document's §1, §2 and §6.
- **BC-4:** the case-against sentence was corrected. **BC-2:** extended to the sender side and the full-width evidence. **BC-5:** added.
- **E1:** 13 citation fixes applied. **E3:** the daily-before-monthly assumption was replaced.

**Rejected**
- **"Remove the password `1234` from the document":** rejected. The scoped test-design SOP doesn't forbid it, and it's the seeded test password already published in `endpoints.md` and the README.
- **"Move the suspected-defect pointers out of the Expected Result":** partly rejected. The SOP requires a one-clause pointer on the case itself, and there is no extra field for it. The pointers are reworded as "*Note: …*" lines so they don't read as expected outcomes.

**Not changed**
- The duplication between TC-002's "9 → 2" variant and TC-005's setup is minor. TC-005 now starts from 0 instead.

**Reviewer confidence:** 80. Deductions: nothing was executed live, the zero-width-space bytes weren't independently confirmed, and the issues were read from the qa-findings copy rather than GitHub. GitHub was confirmed identical earlier in this session.
