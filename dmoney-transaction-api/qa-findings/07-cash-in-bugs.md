# Cash-In Module Bugs

Seeded accounts used (password `1234`): Agent `01686606901` (`salmansrabon+agent@gmail.com`), Customers `01686606902` / `01686606903`, Admin `admin@dmoney.com` (`01686606909`), `SYSTEM`. A second Agent and several extra Customers were registered with `POST /user/register` and activated by Admin. UI login uses the OTP printed in the API console.

Step tags: **[UI]** = executed in the browser with `agent-browser` against `http://localhost:3006`. **[API]** = request sent to `http://localhost:5000`. A step marked "(not executed)" was not run, and the reason is stated.

## Section 1: List of Bugs

### High Priority

#### CASHIN-H01
- **Bug Id:** CASHIN-H01
- **Bug Title:** [Deposit] A single deposit request without `from_account` crashes the entire API process
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible. The Agent Cash In page always sends both `from_account` (from localStorage) and `to_account`, and blocks empty fields before sending (UI test: empty fields show "Customer phone number is required." and "Amount is required.").
  2. [API] Login as Agent `salmansrabon+agent@gmail.com` (`POST /user/login`, then `POST /user/verify-otp` with the OTP from the API console) and keep the JWT.
  3. [API] `POST /transaction/deposit` with headers `Authorization: Bearer <JWT>`, `X-AUTH-SECRET-KEY: <partner key>` and body `{"amount":100}`.
  4. [API] `GET /` on the same server.
  - Control: the body `{}` returns HTTP 400 because the amount check runs first, so the crash needs a valid `amount` with the account fields missing.
- **Expected result:** HTTP 400 with a validation message; the server keeps running and `GET /` returns `{"message":"Server is up"}`.
- **Actual result:** The request gets an empty reply (curl exit 52). The Node process exits with `Error: WHERE parameter "phone_number" has invalid "undefined" value`. `GET /` then fails with "Could not connect to server" until the API is restarted. Any authenticated Agent can take the API down with one request.

#### CASHIN-H02
- **Bug Id:** CASHIN-H02
- **Bug Title:** [Limit] `GET /transaction/limit/:account` reports a remaining limit that disagrees with the cap Deposit enforces
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Agent, open `/agent/cash-in`, enter customer `01686606902` and amount `9000`, click "Cash In →". (Executed; customer balance was 6010.5.) The page shows "Limit exceeded. You can deposit a maximum of 3989.50 tk to this customer."
  2. [API] Login as Admin; `GET /transaction/balance/01686606902` → `6010.5`.
  3. [API] `GET /transaction/limit/01686606902` → read `limit`.
  4. [UI] Frontend: not reproducible for the endpoint itself. No page in `dmoney-web-react/src` calls `/transaction/limit`.
- **Expected result:** `limit` equals the headroom the UI/Deposit enforces: 10000 − 6010.5 = `3989.5`.
- **Actual result:** `limit` = `9245` (earlier, at balance 5970.5, it returned `9285` while the deposit allowed only 4029.50). For customer `01686606903` (balance 8959.5, so 1040.5 of headroom) it returned `1169.999…`. The endpoint's figure does not match the enforced cap. Cause visible in code: it only sums credits with description "Deposit" minus debits with description "Withdraw", so Stripe cash-ins, received transfers and payments are ignored.

#### CASHIN-H03
- **Bug Id:** CASHIN-H03
- **Bug Title:** [Stripe Cash-In] Confirm can credit the same payment twice when `confirm` is called concurrently
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Login as Customer, open `/customer/cash-in-bank`, enter `500`, click "Continue to Payment". (Executed up to this point: the page returned "Failed to create payment intent", see Actual result. The card step could not be reached.)
  2. [UI] With a working Stripe test key, pay with test card `4242 4242 4242 4242`. (Not executed: the Stripe keys in `.env` are placeholders.)
  3. [API] Take the `paymentIntentId` (`pi_…`) of that succeeded payment and send two `POST /transaction/stripe/confirm` requests with `{"paymentIntentId":"<id>"}` at the same moment as that Customer. (Not executed, same reason.)
  4. [API] `GET /transaction/balance/<customer>` and read the ledger rows for that `trnxId`.
- **Expected result:** One SYSTEM debit and one customer credit of 500; the second call returns HTTP 208 "already processed".
- **Actual result:** Not executed. Evidence: Serena `find_symbol` on `confirmCashIn` shows the "already processed" check is a plain `Transactions.findOne({ where: { trnxId } })` followed by two inserts, with no lock or DB transaction. Serena `search_for_pattern` shows `sequelize.transaction` and `FOR UPDATE` in deposit, withdraw, sendMoney, payment and adminDeposit, but not in `stripeCashIn.controller.js`. `SHOW INDEX FROM Transactions` shows only the `PRIMARY` key, so `trnxId` has no unique constraint. Expected outcome under a true race: balance credited 1000 for one 500 payment.

#### CASHIN-H04
- **Bug Id:** CASHIN-H04
- **Bug Title:** [Stripe Cash-In] Wallet cap of 10,000 is checked only when the payment is created, not when it is confirmed
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Login as a Customer with balance 0. On `/customer/cash-in-bank` start three separate payments of `9000` in three browser tabs, so all three payment forms are open before any is paid. (Not executed: blocked at "Failed to create payment intent", placeholder Stripe keys.)
  2. [UI] Pay all three with the test card. (Not executed.)
  3. [API] `GET /transaction/balance/<customer>`.
- **Expected result:** Cap enforced: the wallet never exceeds 10,000 (BRD §7.5 rule 5).
- **Actual result:** Not executed. Code evidence (Serena `find_symbol`): `createPaymentIntent` checks balance against the cap, but `confirmCashIn` credits `paymentIntent.amount / 100` with no cap check, and each of the three intents passes the create-time check against the same balance 0. Expected outcome: balance 27,000.

#### CASHIN-H05
- **Bug Id:** CASHIN-H05
- **Bug Title:** [Stripe Cash-In] A failure after the card is charged leaves no ledger credit and no way to retry
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Login as Customer, open `/customer/cash-in-bank`, enter `100`, continue to the card step. (Not executed: the card step is unreachable with placeholder Stripe keys.)
  2. [API] Cause the second ledger insert of `POST /transaction/stripe/confirm` to fail after the first one succeeds (for example by interrupting the DB connection mid-request). (Not executed.)
  3. [API] Repeat `POST /transaction/stripe/confirm` with the same `paymentIntentId`.
- **Expected result:** Both ledger rows are written together or neither is; the retry credits the customer.
- **Actual result:** Not executed (needs fault injection and working Stripe keys). Code evidence: the SYSTEM debit and the customer credit are two separate `Transactions.create` calls with no DB transaction. Graphify `explain confirmCashIn()` lists only two calls (`getBalance`, `findUserByIdentifier`). If only the first insert succeeds, the retry finds a row with the same `trnxId`, returns HTTP 208 "already processed", and the customer is charged but never credited.

#### CASHIN-H06
- **Bug Id:** CASHIN-H06
- **Bug Title:** [Cash In (Bank) page] When `confirm` fails after a successful card payment, the page is stuck and shows no transaction ID
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Login as Customer, open `/customer/cash-in-bank`, enter `100`, click "Continue to Payment". (Executed: the page stops at "Failed to create payment intent" with the placeholder Stripe key.)
  2. [UI] With a working Stripe test key: enter test card `4242 4242 4242 4242`, any future date and CVC, set the network to offline (or block `/transaction/stripe/confirm`) in DevTools, click "Pay ৳ 100.00". (Not executed.)
- **Expected result:** An error that shows the payment ID, with the form usable again (retry `confirm` or go back).
- **Actual result:** Not executed. Code evidence (Serena `find_symbol` on `PaymentForm/handleSubmit` and `CashInBank/handlePaymentSuccess` in `cash-in-bank/page.tsx`): the error text says "contact support with your Transaction ID", but no ID is stored or displayed (`paymentIntentId` is only a parameter). `setLoading(false)` in `handleSubmit` runs only on the Stripe-error and not-succeeded paths, so after `onSuccess` the card form's button stays on "Processing…" and Back stays disabled. A refresh loses the ID.

### Medium Priority

#### CASHIN-M01
- **Bug Id:** CASHIN-M01
- **Bug Title:** [Deposit] Two Agents depositing at the same time can get HTTP 500 "Deadlock found when trying to get lock", even to different customers
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Two browser sessions as two different Agents on `/agent/cash-in`, each with a deposit of `10` filled in, then click "Cash In →" in both at the same moment. (Executed 4 rounds: both pages showed "Deposit successful" every time. The two clicks, sent from separate processes, did not overlap enough to hit the problem, so the UI could not reproduce it.)
  2. [API] Create and activate a second Agent (`POST /user/register`, then `PATCH /user/update/<id>` `{"status":"active"}` as Admin) and fund both Agents (`POST /transaction/deposit` as `SYSTEM` with `from_account:"SYSTEM"`).
  3. [API] Fire these two requests at the same moment, each as its own Agent: Agent 1 `{"from_account":"01686606901","to_account":"01686606902","amount":10}` and Agent 2 `{"from_account":"<agent2 phone>","to_account":"<another active customer>","amount":10}`. Repeat 4 times.
  4. [API] Repeat with both Agents depositing to the same customer.
- **Expected result:** Both deposits succeed (HTTP 201), or one is rejected with a business message. Never HTTP 500.
- **Actual result:** Different customers: 2 of 4 rounds returned HTTP 500 for one request with `{"message":"Internal server error","error":"Deadlock found when trying to get lock; try restarting transaction"}`. Same customer: 4 of 7 rounds did the same. The failed deposit is rolled back (no money lost) but a valid deposit fails and the DB error text is returned. `SHOW INDEX FROM Transactions` shows only the `PRIMARY` key (no index on `account`).

#### CASHIN-M02
- **Bug Id:** CASHIN-M02
- **Bug Title:** [Deposit] Business-rule failures (limit exceeded, insufficient balance) return HTTP 208 "Already Reported"
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Agent, open `/agent/cash-in`, enter customer `01686606902` and amount `9000`, click "Cash In →". (Executed.)
  2. [API] `POST /transaction/deposit` as Agent `{"from_account":"01686606901","to_account":"01686606902","amount":9000}` (customer balance 5970.5 at that time).
- **Expected result:** A 4xx status (rejected request) with the limit message.
- **Actual result:** UI shows the error text only because the page special-cases `res.status === 208`. API: HTTP 208 with `{"message":"Limit exceeded. You can deposit a maximum of 4029.50 tk to this customer."}`. The same 208 is used for "Insufficient balance" (seen in the UI when the Agent's balance was below the amount) and for "already processed". Serena `search_for_pattern` shows `status(208)` in deposit, withdraw, sendMoney, payment, Stripe and user controllers, and `res.status === 208` special-cases in six frontend pages. A client that treats 2xx as success will show a failed deposit as done.

#### CASHIN-M03
- **Bug Id:** CASHIN-M03
- **Bug Title:** [Deposit] Amounts with more than 2 decimals are accepted and the agent commission is stored unrounded
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Agent, open `/agent/cash-in`, enter customer `01686606903` and amount `10.001`, click "Cash In →". (Executed.)
  2. [API] `POST /transaction/deposit` as Agent `{"from_account":"01686606901","to_account":"01686606903","amount":10.001}`.
  3. [API] Read the ledger rows for the returned `trnxId` (read-only SQL on `Transactions`).
- **Expected result:** The amount is rejected (money has 2 decimal places) or the commission is rounded to 2 decimals.
- **Actual result:** UI: "Deposit successful" with "Total Amount ৳ 10.00" (the page rounds for display). Ledger (UI deposit `TXNLIFZUKEHWD`): agent row `debit 10.001, credit 0.250025`. API: HTTP 201 with `"commission":0.250025`. The sub-paisa amount and the 6-decimal commission are stored as is, and the page hides it.

#### CASHIN-M04
- **Bug Id:** CASHIN-M04
- **Bug Title:** [Admin Deposit] Amount `"Infinity"` is not rejected as invalid and returns HTTP 500 with the raw DB error
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible. The admin deposit amount field is a numeric input (`/admin/deposit`, "Amount (BDT)") that cannot submit the text "Infinity".
  2. [API] Login as Admin (`admin@dmoney.com`, password `1234`).
  3. [API] `POST /transaction/adminDeposit` `{"from_account":"01686606909","to_account":"SYSTEM","amount":"Infinity"}`.
- **Expected result:** HTTP 400 "Amount must be greater than 0" (or another validation message).
- **Actual result:** HTTP 500 `{"message":"Internal server error","error":"Data truncated for column 'debit' at row 1"}`. The invalid value passes validation and the database error text is returned to the caller.

#### CASHIN-M05
- **Bug Id:** CASHIN-M05
- **Bug Title:** [Deposit] A configured agent commission rate of 0 is silently replaced with 2.5% (same pattern in Withdraw)
- **Confidence:** Medium
- **Step to reproduce:**
  1. [API] Set the Deposit rule `rate` to `0` in the `Commissions` table (there is no API or UI for this; not done, to keep the DB unchanged).
  2. [UI] Login as Agent, open `/agent/cash-in`, deposit `1000` to customer `01686606902`, and read "Service Fee" (it shows 0.00, see CASHIN-L04) and the ledger commission.
  3. [API] `POST /transaction/deposit` as Agent `{"from_account":"01686606901","to_account":"01686606902","amount":1000}` and read `commission`.
- **Expected result:** `commission: 0`.
- **Actual result:** Not executed (needs a direct edit of `Commissions`). Code evidence (Serena `search_for_pattern`): `config.agentCommissionRate || 0.025` in deposit and withdraw, and `config.minTxnAmount || 10` in deposit, withdraw, payment, sendMoney and Stripe, treat 0 as "not set". The seeded Deposit rule is 0.025, 10, 10000 (read-only SQL). Expected outcome: `commission: 25`.

#### CASHIN-M06
- **Bug Id:** CASHIN-M06
- **Bug Title:** [Cash In (Bank) page] A repeated `confirm` for an already-processed payment shows "Cash In Successful!" with an empty Transaction ID
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Login as Customer, complete one cash-in on `/customer/cash-in-bank` (test card). (Not executed: blocked at step 1 by the placeholder Stripe key.)
  2. [UI] Trigger the `confirm` call a second time for the same payment (for example, replay the `POST /transaction/stripe/confirm` request from DevTools while on the page).
  3. [API] `POST /transaction/stripe/confirm` with the same `paymentIntentId` → read the status and body.
- **Expected result:** The page shows an "already processed" message.
- **Actual result:** Not executed. Code evidence: the backend returns HTTP 208 `{"message":"This payment has already been processed"}` with no `trnxId` or amount. Serena `find_symbol` on `handlePaymentSuccess` shows it never checks for 208 (a search for `status === 208` in `dmoney-web-react/src` lists six other pages but not `cash-in-bank`), so it calls `setTrnxId(undefined)` and `setStep(3)`: the success card with an empty Transaction ID and "৳X has been added to your DMoney wallet".

### Low Priority

#### CASHIN-L01
- **Bug Id:** CASHIN-L01
- **Bug Title:** [Stripe Cash-In] Stripe errors return HTTP 500 with the raw Stripe message, including part of the API key
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Customer, open `/customer/cash-in-bank`, enter `100`, click "Continue to Payment". (Executed.) The page shows only "Failed to create payment intent".
  2. [API] Login as Customer `salmansrabon+customer1@gmail.com`.
  3. [API] `POST /transaction/stripe/create-intent` `{"amount":100}` (run with the placeholder `STRIPE_SECRET_KEY` in `.env`).
- **Expected result:** A generic failure message with no internal or provider detail.
- **Actual result:** HTTP 500 `{"message":"Failed to create payment intent","error":"Invalid API Key provided: stripe_s**********here"}`. The raw provider message, including key fragments, reaches the caller (the page happens to display only `message`). `confirmCashIn` uses the same catch pattern.

#### CASHIN-L02
- **Bug Id:** CASHIN-L02
- **Bug Title:** [Startup] A blank `STRIPE_SECRET_KEY` makes the whole API fail to start, not just Stripe cash-in
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not applicable. The API does not start, so no page can load.
  2. [API] In `dmoney-transaction-api`, load `.env` and start the server with an empty key: `STRIPE_SECRET_KEY="" PORT=5001 node server.js`.
- **Expected result:** The API starts and only the Stripe endpoints report a configuration error.
- **Actual result:** The process exits with code 1: `Error: Neither apiKey nor config.authenticator provided` (thrown at `stripeCashIn.controller.js` import time). With the key present it starts normally.

#### CASHIN-L03
- **Bug Id:** CASHIN-L03
- **Bug Title:** [Deposit] An Agent can tell which phone numbers are registered from different `from_account` responses (404 vs 403)
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Frontend: not reproducible. The page always sends the logged-in Agent's own number as `from_account`.
  2. [API] Login as Agent `01686606901`.
  3. [API] `POST /transaction/deposit` `{"from_account":"01999999999","to_account":"01686606902","amount":50}`.
  4. [API] `POST /transaction/deposit` `{"from_account":"01686606903","to_account":"01686606902","amount":50}`.
- **Expected result:** The same response for both requests.
- **Actual result:** Step 3: HTTP 404 "From Account does not exist". Step 4: HTTP 403 "Unauthorized: you can only initiate transactions from your own account". The status code shows whether the number is a registered user.

#### CASHIN-L04
- **Bug Id:** CASHIN-L04
- **Bug Title:** [Agent Cash In page] The receipt always shows "Service Fee ৳ 0.00" although the agent earns a commission
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Agent, open `/agent/cash-in`, enter customer `01686606902` and amount `100`, click "Cash In →". Read the "Service Fee" box on the success card. (Executed.)
  2. [API] Read the commission for that deposit: the `commission` field of `POST /transaction/deposit`, or the ledger row (read-only SQL).
- **Expected result:** The page shows the commission (`2.5` for amount 100).
- **Actual result:** UI: "Total Amount ৳ 100.00", "Service Fee ৳ 0.00". Ledger for the same deposit (`TXN8U0JBC47Q9`): agent row `debit 100, credit 2.5, description "Deposit Commission"`. The page renders the literal `৳ 0.00` and never reads `res.data.commission`.

#### CASHIN-L05
- **Bug Id:** CASHIN-L05
- **Bug Title:** [Agent Cash In page] Phone format and minimum amount are not checked before sending (only empty fields are)
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Agent, open `/agent/cash-in`. Enter customer `abc` and amount `5`, click "Cash In →". (Executed.)
  2. [UI] Enter customer `01686606902` and amount `5` (then `0.5`), click "Cash In →". (Executed.)
  3. [UI] Leave both fields empty, click "Cash In →". (Executed.)
- **Expected result:** Inline field errors for the invalid phone and for an amount below the minimum of 10, before any request is sent.
- **Actual result:** Step 1: request is sent and the page shows the server message "To Account does not exist". Step 2 (both amounts): server message "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk". Step 3: client-side messages "Customer phone number is required." and "Amount is required." Only empty/zero checks happen in the browser. The amount field has `min: 1` and the form uses `noValidate`.

#### CASHIN-L06
- **Bug Id:** CASHIN-L06
- **Bug Title:** [Stripe Cash-In] Confirm debits SYSTEM without checking SYSTEM's balance
- **Confidence:** Medium
- **Step to reproduce:**
  1. [UI] Login as Customer and complete a cash-in on `/customer/cash-in-bank` while the SYSTEM balance is below the payment amount. (Not executed: placeholder Stripe keys.)
  2. [API] Reduce the SYSTEM balance below the amount (via `POST /transaction/deposit` from `SYSTEM` to an Agent), then call `POST /transaction/stripe/confirm` for a succeeded payment. (Not executed.)
- **Expected result:** Confirm is rejected or handled when SYSTEM cannot cover the amount (Deposit Flow 1 returns "SYSTEM account has insufficient balance").
- **Actual result:** Not executed. Code evidence: `confirmCashIn` writes the SYSTEM debit with no balance read and no lock, so SYSTEM can go negative. SYSTEM currently holds about 9.9 million, so this is only visible after SYSTEM is drained.

#### CASHIN-L07
- **Bug Id:** CASHIN-L07
- **Bug Title:** [Admin Deposit] Ledger rows are saved with `transaction_type` NULL
- **Confidence:** High
- **Step to reproduce:**
  1. [UI] Login as Admin, open `/admin/deposit`, enter `SYSTEM` and amount `1`, click "Deposit to SYSTEM". (Executed: "Deposit to SYSTEM account successful".)
  2. [API] Read the two ledger rows of that deposit (`GET /transaction/search/<trnxId>`, or read-only SQL on `Transactions`).
- **Expected result:** `transaction_type` is `AdminDeposit`, as listed in the model column comment.
- **Actual result:** Read-only SQL after the UI deposit: row 182 `01686606909 | Admin Deposit to SYSTEM | debit 1 | NULL` and row 183 `SYSTEM | Admin Deposit | credit 1 | NULL`. Stripe rows are NULL too (`Bank Cash In (Stripe) | NULL | 6`); that part is already known in `02-deposit-bugs.md`.

## Section 2: Summary

| Priority | Count | High conf. | Medium conf. | Low conf. |
|---|---|---|---|---|
| High | 6 | 2 | 4 | 0 |
| Medium | 6 | 4 | 2 | 0 |
| Low | 7 | 6 | 1 | 0 |
| **Total** | **19** | **12** | **7** | **0** |

| Bug Id | Title | Priority | Confidence | Reproduced via |
|---|---|---|---|---|
| CASHIN-H01 | Deposit without `from_account` crashes the API process | High | High | API (executed) |
| CASHIN-H02 | Limit endpoint disagrees with enforced cap | High | High | UI + API (executed) |
| CASHIN-H03 | Stripe confirm can credit twice on concurrent calls | High | Medium | Code + DB index (not executed) |
| CASHIN-H04 | Wallet cap not checked at Stripe confirm | High | Medium | Code (not executed) |
| CASHIN-H05 | Stripe confirm not atomic, retry blocked | High | Medium | Code (not executed) |
| CASHIN-H06 | Bank cash-in page stuck, no ID after confirm failure | High | Medium | Code (not executed) |
| CASHIN-M01 | Concurrent deposits fail with HTTP 500 deadlock | Medium | High | API (executed, intermittent); UI 4 rounds did not hit it |
| CASHIN-M02 | Business failures return HTTP 208 | Medium | High | UI + API (executed) |
| CASHIN-M03 | More than 2 decimals accepted, commission unrounded | Medium | High | UI + API + SQL (executed) |
| CASHIN-M04 | Admin deposit `"Infinity"` returns 500 with DB error | Medium | High | API (executed) |
| CASHIN-M05 | Commission rate 0 replaced by 2.5% | Medium | Medium | Code (not executed) |
| CASHIN-M06 | Bank cash-in page shows success on HTTP 208 confirm | Medium | Medium | Code (not executed) |
| CASHIN-L01 | Stripe error returned raw with key fragments | Low | High | UI + API (executed) |
| CASHIN-L02 | Blank Stripe key stops the whole API at startup | Low | High | API start-up (executed) |
| CASHIN-L03 | 404 vs 403 reveals registered numbers | Low | High | API (executed) |
| CASHIN-L04 | Agent receipt always shows fee 0.00 | Low | High | UI + SQL (executed) |
| CASHIN-L05 | Agent page: no phone / minimum-amount check before sending | Low | High | UI (executed) |
| CASHIN-L06 | Stripe confirm does not check SYSTEM balance | Low | Medium | Code (not executed) |
| CASHIN-L07 | Admin deposit rows have NULL `transaction_type` | Low | High | UI + SQL (executed) |

- **Scope covered:** `POST /transaction/deposit`, `POST /transaction/adminDeposit`, `POST /transaction/stripe/create-intent`, `POST /transaction/stripe/confirm`, `GET /transaction/limit/:account`, `GET /transaction/balance/:account`; pages `/agent/cash-in`, `/customer/cash-in-bank`, `/admin/deposit`; `Commission.getConfig`, `getBalance`, the `Transactions` and `Commissions` tables.
- **Tools used:**
  - **Serena:** project `r2sdet_AI` activated (re-activated once after the session lost it). `get_symbols_overview` on the deposit and Stripe controllers; `find_symbol` with bodies for `confirmCashIn`, `handlePaymentSuccess` and `PaymentForm/handleSubmit`; `search_for_pattern` for `getConfig` and `|| default` fallbacks, every `status(208)`, every frontend `transaction/…` call, and every `sequelize.transaction` / `FOR UPDATE` / `unique: true`. `find_referencing_symbols` returned nothing useful for CommonJS `exports.*` handlers.
  - **graphify:** `GRAPH_REPORT.md`; `query` on the Stripe and Deposit flows; `explain "confirmCashIn()"` and `explain "handleDeposit()"`; `path "CashInBank()" "confirmCashIn()" --undirected` (links the page, through the BRD node "Bank Cash-In via Stripe", to the controller). Graph built 2026-10-03, same day as the latest commit; not rebuilt. Running these changed the tracked file `graphify-out/cache/last_query_stamp`.
  - **/blast-radius:** run; result: no source changes against `main` (only untracked files: the find-bug skill and report files). The module's route → controller → model → page chains were traced with the Serena and graphify results instead.
  - **agent-browser:** v0.38.2, headless, in named sessions restricted to `localhost`. Logged in through the UI as Agent, second Agent, Customer and Admin (OTP read from the API console). Executed: Agent Cash In (9000 over cap, 10.001, 100, `abc`/5, 5, 0.5, empty), concurrent two-Agent clicks (4 rounds), Customer bank cash-in step 1, Admin deposit. The Stripe card step (steps 2-3 of the wizard) could not be reached.
- **Environment:** API (`localhost:5000`) and web app (`localhost:3006`) started locally from the repo with the `.env` values; DB `dmoneydb` on `localhost`. Both were stopped after testing. The Stripe keys in `.env` are placeholders (`stripe_secret_key_here`, `stripe_publishable_key`), so create-intent and confirm cannot succeed here.
- **Already known (not re-listed):** Stripe confirm does not re-check customer status; Stripe rows have NULL `transaction_type`; no Stripe webhook; no rate limit or replay protection; Stripe metadata trust; no SYSTEM outflow cap; `GET /transaction/limit/:account` hardcoded to 10000 (CASHIN-H02 is a new, reproduced mismatch on top of it).
- **Candidates withdrawn after testing:**
  - Cap breach for a customer with zero ledger rows: not reproduced in 5 attempts with two different Agents (the cap held with a 201 + 208, or one request hit the deadlock in CASHIN-M01).
  - `POST /transaction/deposit` with body `{}`: returns HTTP 400, no crash (the crash needs a valid `amount` and missing account fields, CASHIN-H01).
  - The first version of this report was code review only. Its claims about the zero-row cap breach and the `{}` crash were wrong and are replaced here.
- **Not verified / limitations:**
  - Every Stripe step (create-intent success, card form, confirm) is unexecuted because of the placeholder keys: CASHIN-H03 to H06, M06, L06.
  - CASHIN-M01 is intermittent (observed rates are in the bug) and did not reproduce through two browser sessions.
  - CASHIN-M05 needs a direct edit of the `Commissions` table, which was not done.
  - The same unguarded `Users.findOne({ where: { phone_number: <body value> } })` pattern as CASHIN-H01 likely exists in other controllers (withdraw, sendMoney, payment); not tested, outside this module.
- **Test data left in the local DB:** users `racebug1`–`racebug7@gmail.com` (phones `01799000001`–`01799000007`) and Agent `racebugagent2@gmail.com` (`01799000011`), all active; extra ledger rows from the deposits above (SYSTEM → Agent top-ups, deposits to seeded customers `01686606902` and `01686606903`, a 1 BDT admin deposit, the UI deposits `TXNLIFZUKEHWD` and `TXN8U0JBC47Q9`).
