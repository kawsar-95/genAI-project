# Test Charters: PR #8 Send Money fixes (issues #1–#7)

- **Target:** [PR #8](https://github.com/kawsar-95/genAI-project/pull/8) `fix/send-money-bugs` @ `3a6456e`. It touches `POST /transaction/sendmoney`, the shared `checkCustomerLimits` service (also used by Payment and Withdraw), and `/customer/send-money`.
- **Charters:** 6 charters, 6.5 hours of sessions in total.
- **Highest risks:**
  - Concurrency around the shared customer limit (CH-1).
  - Account identity: the own-account check can be bypassed with characters the database treats as the same number (CH-3).
- **Sources:**
  - GitHub issues #1–#7, fetched 2026-10-07 (no comments).
  - PR #8 (no comments or reviews).
  - `SM-*_requirement.md` (acceptance criteria) and `SM-*_review.md`.
  - `PR-8_blast-radius.md`.
  - BRD in `dmoney-web-react/README.md` (§7.3, §8, §9, §14, §15).
  - graphify communities: "Customer outgoing transactions subject to daily/monthly limits" and "Money-moving endpoints sharing ledger + FOR UPDATE locking".
- **Status:** none of these sessions has been run yet.

## Charter Index

| ID | Title | Priority | Time-box | Risk covered |
|---|---|---|---|---|
| CH-1 | Concurrency against the shared daily/monthly limit | High | 90 min | SM-H02: parallel requests go over the limit; mixed transaction types; check order |
| CH-2 | Malformed Send Money requests vs service availability | High | 60 min | SM-H01, SM-L03: process crash, 500 responses, leaked internals |
| CH-3 | Account identity and the own-account rule | High | 60 min | SM-M01: self-transfer through look-alike numbers; ledger key integrity |
| CH-4 | Amount parsing, precision and error contract | Med | 60 min | SM-M02, SM-L01: accepted formats, decimals, message text |
| CH-5 | Regression of Payment and Cash Out on the shared limit service, and lock contention | Med | 60 min | Blast radius: `checkCustomerLimits` has a fan-in of 3; longer locked section |
| CH-6 | Send Money receipt vs ledger | Low | 60 min | SM-L02: the receipt shows a different figure from what was debited |

## Shared setup (applies to every charter)

- **Environment:**
  - API: `npm run dev` on `:5000`, from branch `fix/send-money-bugs` @ `3a6456e`.
  - Web: `dmoney-web-react` `npm run dev` on `:3000`, with `NEXT_PUBLIC_API_URL=http://localhost:5000`.
  - Database: local MySQL `dmoneydb`. The `mcp__dmoneydb__mysql_query` tool can run read-only SQL against it.
- **Accounts:**
  - Customer 1 `01686606902` / `salmansrabon+customer1@gmail.com`.
  - Customer 2 `01686606903` / `salmansrabon+customer2@gmail.com`.
  - The Agent and Merchant accounts listed in `endpoints.md`.
  - The password is `1234` for all. Use the dev OTP bypass (`POST /user/verify-otp?env=dev`, OTP `0000`).
- **Data hygiene:**
  - Daily limits reset at **00:00 UTC**.
  - Customer 1 used its whole daily quota on 2026-10-06 (UTC).
  - Before each money-moving session, check the quota:
    ```sql
    SELECT COUNT(DISTINCT trnxId), SUM(debit) FROM Transactions
    WHERE account='<phone>' AND debit>0
      AND transaction_type IN ('SendMoney','Payment','Withdraw')
      AND createdAt >= DATE(UTC_TIMESTAMP())
    ```
  - Create extra Customers as Admin if needed, and fund them with an Agent deposit (wallet cap 10,000 Tk).
- **Tools:**
  - `curl` with `-w '%{http_code}'`.
  - Background shell loops for parallel requests.
  - Browser DevTools (Network tab).
  - `GET /` as the health check.
  - `GET /transaction/balance/:account` and `GET /transaction/statement/:account`.

---

### CH-1: Concurrency against the shared daily/monthly limit · Priority: High · Time-box: 90 min

**Mission:** Explore the customer outgoing-limit enforcement with parallel and mixed-type requests to discover any way to complete more transactions or spend more Tk than the daily or monthly limit allows.

**Why (risk):** a customer, or an attacker holding a stolen token, gets past a fraud control that the business relies on, and the ledger ends up out of compliance with BRD §8.

**Areas / Entry points:**
- `POST /transaction/sendmoney`
- `POST /transaction/payment`
- `POST /transaction/withdraw`
- The limit-error response and its `details` breakdown

**Ideas to try:**
- At 0/10, fire 14 parallel sends. At 9/10, fire 2 or 3 parallel sends. At 10/10, send 1 more.
- Near 5,000 Tk, fire 3 parallel sends of 2,000. Also try an amount that is just under the remaining allowance once the 5 Tk fee is added.
- **Mixed types at 9/10:** 1 SendMoney + 1 Payment in parallel, then SendMoney + Withdraw. *(The review predicts this goes over the limit.)*
- **Check order:** a request that is both over the limit and short of balance. Does it get 208 "Insufficient balance" or the 400 limit error?
- A burst that straddles 00:00 UTC.
- Do failed or rejected attempts count toward the limit?

**Oracles:**
- The `COUNT(DISTINCT trnxId)` SQL above is never more than 10 per UTC day (or 50 per month).
- `SUM(debit)` is never more than 5,000 per day.
- Each rejected request returns 400 with `details`, and `usedCount` matches the SQL.
- Claims: SM-H02 AC-1 to AC-7, BRD §8.1–§8.4, and §8.3, which says the limit check runs first.

**Setup & Data:**
- A customer with a known used/remaining count and a balance of at least 3,000 Tk.
- Payment needs an active Merchant. Cash Out needs an active Agent.

**Out of scope:**
- Wallet balance cap (BRD §8.5)
- Agent and Merchant limits (not applicable to them)
- UI double-submit (the button disables while a request is in progress)

**Traceability:**
- Issue #2, SM-H02 AC-1 to AC-7
- Review SM-H02 (Important: the cross-type race)
- Blast radius: the "Shared limit across types" risk

---

### CH-2: Malformed Send Money requests vs service availability · Priority: High · Time-box: 60 min

**Mission:** Explore the Send Money request contract with missing, wrongly typed and malformed fields to discover any request that stops the API, returns a 500 for a client mistake, or leaks internal details.

**Why (risk):** one request from any logged-in user could take the whole platform down (SM-H01), or expose framework internals to an attacker (SM-L03).

**Areas / Entry points:**
- `POST /transaction/sendmoney`
- `GET /` (health check)
- Server console log

**Ideas to try:**
- Leave out each field in turn. Send `null`, `""`, `"   "`, `0`, `true`, `[]`, `["01686606903"]` and `{}` for each account field.
- Send the body form-encoded with `to_account[]=…`. Send an empty body. Send broken JSON, a body of just `null`, or a very large body.
- After each case, call `GET /` and send a normal request from a second user, to confirm the service still works.
- Look for internal text in every non-2xx body: stack traces, "Sequelize", "string violation", SQL fragments.

**Oracles:**
- `GET /` always returns `{"message":"Server is up"}`.
- Invalid input returns 400, never 500 and never a dropped connection.
- 500 bodies contain only `"Internal server error"`.
- Balances and statements are unchanged after each rejected request.
- Claims: SM-H01 AC-1 to AC-5, SM-L03 AC-1 to AC-6, BRD §15.

**Setup & Data:** one logged-in Customer, plus a second user's token for the "service still up" check. Tail the server log.

**Out of scope:**
- The same patterns in Deposit, Withdraw, Payment and Admin Deposit (CASHIN-H01, CASHIN-M04)
- The global `app.js` error handler
- Body-size limits beyond a quick check

**Traceability:**
- Issues #1 and #7, SM-H01 and SM-L03 ACs
- Review SM-H01 and SM-L03

---

### CH-3: Account identity and the own-account rule · Priority: High · Time-box: 60 min

**Mission:** Explore how Send Money identifies sender and receiver accounts, using look-alike phone numbers from both the UI and the API, to discover self-transfers that go through or ledger rows stored under a non-standard account number.

**Why (risk):** a customer loses the 5 Tk fee on a pointless self-transfer, and statements and reconciliation break when ledger rows carry variant account strings (SM-M01).

**Areas / Entry points:**
- The receiver field on `/customer/send-money`
- `to_account` and `from_account` on `POST /transaction/sendmoney`
- `GET /transaction/statement/:account`

**Ideas to try:**
- Your own number with: a trailing space, a leading space, a tab, a non-breaking space, a zero-width space (U+200B), a BOM (U+FEFF), a full-width digit (`０1686606903`), a `+880` prefix, or the leading 0 dropped.
- **In the UI:** paste the number copied from a chat app or a PDF, which may carry invisible characters.
- **A different customer's number with padding:** check that it's credited under the canonical number. Check the statement's `account` column with SQL using `HEX(account)`.
- **A padded `from_account`:** does the ownership check still pass, and which string ends up on the debit row?

**Oracles:**
- Every variant of your own number returns 400 "From account and to account cannot be the same".
- Neither balance changes, and no fee is charged.
- Every new ledger row's `account` value is exactly 11 ASCII digits (`SELECT HEX(account) …`).
- Claims: SM-M01 AC-1 to AC-8, BRD §7.3 precondition 2, §14.

**Setup & Data:**
- A Customer with at least 25 Tk and daily quota left.
- A text file of prepared look-alike strings, including the invisible characters.

**Out of scope:**
- Phone-format validation as a feature
- Cleaning up historic rows such as `'01686606903 '`

**Traceability:**
- Issue #3, SM-M01 AC-1 to AC-8
- Review SM-M01 (Important: the collation bypass, a merge blocker)

---

### CH-4: Amount parsing, precision and error contract · Priority: Med · Time-box: 60 min

**Mission:** Explore Send Money amount handling with unusual numeric formats, decimal boundaries and minimum-amount edges, through both the UI and the API, to discover accepted inputs that move the wrong amount, receipts that don't match the ledger, and error messages that break the documented contract.

**Why (risk):** money moves in an amount the user didn't intend, or sub-paisa values drift into balances. API clients that check exact messages break (SM-M02, SM-L01).

**Areas / Entry points:**
- The amount field on `/customer/send-money`
- `amount` on `POST /transaction/sendmoney`

**Ideas to try:**
- **Formats:** `"0x10"`, `"1e1"`, `1e1`, `[20]`, `true`, `"20"`, `" 20 "`, `"020"`, `"20."`, `".5"`, `"２０"`, `-0`, `1e21`, `"9"×400`, `NaN`, `"Infinity"`.
- **Precision:** `10.555`, `10.55`, `10.5`, `10.550`, `0.1+0.2` (sent as a computed float).
- **Minimum boundary:** `9.99`, `10`, `10.00`, `10.01`.
- **UI:** type `1e1` and `10.555` in the number field. Use the spinner arrows. Paste into the field. Check whether any request is sent (Network tab).
- **Messages:** compare the message text across `0`, `"0"`, `-1`, `"abc"`, a missing amount, and `10.555`.

**Oracles:**
- The debit equals amount + 5 and the credit equals amount, to exactly 2 decimals (SQL on the new rows).
- Rejected formats move no money.
- The invalid-amount message is exactly `Amount must be a valid number greater than 0` (SM-L01 AC-1 to AC-3).
- 3+ decimals are rejected in the UI before any request is sent.
- Claims: SM-M02 AC-1 to AC-5 *(provisional)*, SM-L01 AC-1 to AC-6, BRD §7.3 precondition 5, §15.

**Setup & Data:** a Customer with at least 100 Tk and daily quota left (each accepted case uses 1 of the 10).

**Out of scope:**
- Percentage-fee rounding (Payment and Withdraw)
- Correcting existing 3-decimal rows

**Traceability:**
- Issues #4 and #5, SM-M02 and SM-L01 ACs
- Review SM-L01 (Minor: the message differs from the spec, a merge blocker)

---

### CH-5: Regression of Payment and Cash Out on the shared limit service, and lock contention · Priority: Med · Time-box: 60 min

**Mission:** Explore the Payment and Cash Out flows for every role, and run mixed money-moving traffic, to discover regressions from the changed `checkCustomerLimits` and slow or failed requests caused by the longer locked database section.

**Why (risk):** `checkCustomerLimits` is shared by three money-moving endpoints and five pages, so a regression would affect all of them. Lock waits across the whole `Transactions` table could surface as generic 500s.

**Areas / Entry points:**
- `/customer/payment`, `/customer/cash-out`, `/agent/payment`, `/merchant/cash-out`
- `POST /transaction/payment` and `POST /transaction/withdraw`

**Ideas to try:**
- For each page: one normal transaction, one at the 10/10 limit (Customer only), and one with insufficient balance.
- Confirm that Agent and Merchant transactions ignore the customer limits.
- **Load:** run 20–30 parallel requests mixing SendMoney (different customers), Payment and Withdraw. Watch latency, any 500s, and lock-wait errors in the server log.
- Check that limit errors on Payment and Withdraw keep the same shape (400 with `details`).

**Oracles:**
- The behaviour matches `main` (compare with a session on `main`, or with `08-send-money-bugs.md` and `transaction-limits.report.md`).
- No 500s under mixed load.
- Ledger totals balance: for each `trnxId`, `SUM(credit) = SUM(debit)` across all rows.
- Claims: BRD §7.2, §7.4, §8.2.

**Setup & Data:**
- Two or more funded Customers, the Agent, the Merchant, and SQL access.

**Out of scope:**
- Fixing the cross-type race (that's CH-1's finding)
- Adding an index
- Stripe cash-in

**Traceability:**
- `PR-8_blast-radius.md`: the fan-in table (`checkCustomerLimits` 3 → 3 → 5), the DB fan-out table (4 → 7 statements inside the lock), and verification rows 7–8

---

### CH-6: Send Money receipt vs ledger · Priority: Low · Time-box: 60 min

**Mission:** Explore the Send Money success receipt across amounts, repeated sends and screen sizes, comparing it with the statement and with other receipt pages, to discover figures that mislead the customer about what they paid.

**Why (risk):** customers misread the total they were charged and raise support tickets or disputes (SM-L02).

**Areas / Entry points:**
- The receipt on `/customer/send-money`
- `/customer/self-statement`
- The cash-out and payment receipts, for comparison

**Ideas to try:**
- Send 10, 10.55, 4,995 and the maximum allowed. For each, check Amount Sent, Service Fee, Total Amount and Remaining Balance.
- Send twice in a row without reloading. Does the receipt clear and refresh correctly?
- Mobile viewport (375 px): do the four tiles wrap readably?
- Use keyboard-only navigation to the receipt.
- Compare the wording with the other four receipt pages, which still use "Total Amount" for the amount only.

**Oracles:**
- Total Amount equals the statement debit for that `trnxId`.
- Remaining Balance equals `GET /transaction/balance`.
- Labels are consistent with the comparable pages (FEW HICCUPPS: Comparable products, User expectations).
- Claims: SM-L02 AC-1 to AC-4 *(provisional)*.

**Setup & Data:** Customer 2 logged in on the web, with at least 5,100 Tk and daily quota left.

**Out of scope:**
- Changing the other four receipt pages
- Printing or exporting receipts

**Traceability:**
- Issue #6, SM-L02 ACs
- Review SM-L02 (Minor: the silent `?? 0` fallback)

---

## Session Report template (copy one per charter)

```markdown
## Session Report — CH-<n>

| Field | Value |
|---|---|
| Tester | <name> |
| Date / Start | <yyyy-mm-dd hh:mm> |
| Duration | <actual> vs <time-box> |
| Build / Env | fix/send-money-bugs @ 3a6456e, API :5000, Web :3000 |
| Charter vs Opportunity | <e.g. 80 / 20 %> |
| Time split (T/B/S) | Test <x>% · Bug investigation <y>% · Setup <z>% |

**Areas covered:** <list>
**Test notes:** <what was tried, observations, oddities — terse bullets>

**Bugs:**
| ID | Title | Severity | Steps (short) | Evidence |
|---|---|---|---|---|

**Issues / Blockers:** <env, data, access, questions>
**New charter ideas:** <follow-ups>

**Debrief (PROOF):** Past · Results · Obstacles · Outlook · Feelings (High/Med/Low confidence + why)
```

## Open Questions

1. **Decimals (SM-M02):** must amounts have at most 2 decimal places, and should a request with more be rejected or rounded? The BRD has no rule, and §4.2 says `debit` is INTEGER.
2. **Check order (SM-H02):** when a request is both over the limit and short of balance, should the customer get the limit error (BRD §8.3 says limits are checked first) or "Insufficient balance"? PR #8 now returns the latter.
3. **Shared limit (SM-H02 AC-7):** must the limit hold across SendMoney, Payment and Withdraw arriving at the same time? It's implied by BRD §8.2 but never stated.
4. **Phone numbers (SM-M01):** which normalization applies? Must account fields be exactly 11 ASCII digits in transaction requests, as BRD §14 requires at registration?
5. **Error message (SM-L01):** must every invalid amount return exactly `Amount must be a valid number greater than 0`, or may too many decimals have its own message?
6. **Receipt (SM-L02):** what does "Total Amount" mean, the amount sent or the amount debited? Should all five receipt pages follow the same rule?
7. **Lock timeouts:** what should a customer see when the system is too busy to apply the limit lock? The BRD only lists 500 for "Database error".
