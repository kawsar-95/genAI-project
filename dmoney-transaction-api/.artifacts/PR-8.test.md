# PR #8 — Send Money fixes (issues #1–#7): Test Cases

> Evidence, assumptions and adversarial review: [PR-8.review.md](PR-8.review.md) — read before revising these cases.

## 1. Feature Summary

- **What this feature does for the user:** lets one customer send money to another customer safely.
- **What changed:**
  - Requests with a missing account, or with an account or amount that isn't in a valid form, are now turned away as validation errors instead of crashing the service or moving money.
  - Daily and monthly limits now hold when several sends arrive at the same moment.
  - An own number padded with spaces can no longer be used for a self-transfer.
  - Amounts may have at most two decimal places.
  - The receipt now shows Amount Sent, Service Fee, and a Total Amount that includes the fee.
- **Who is affected:**
  - Customers, through the Send Money page and the API.
  - Customer Payment and Cash Out, which share the same daily and monthly limits.
- **Business flows touched:** Customer-to-customer Send Money; the customer daily and monthly outgoing limits; the Send Money receipt.
- **Related flows that could break:**
  - **Customer Payment and Cash Out:** they use the same limit check that was changed.
  - **Agent Payment and Merchant Cash Out:** they go through the same endpoints, and the limits must still not apply to them.
  - **Other customers' transfers running at the same time:** more work now happens while the account is locked.
- **Change tier:** logic.
- **Intent source:** GitHub issues #1–#7. The issues contain no acceptance criteria, so the criteria were derived from them, the business requirements, and the requirement analyses for these issues.
- **Scope:** Sanity, plus concurrency, because concurrency is the defect being fixed.

## 2. Acceptance Criteria

None of the issues states acceptance criteria. The criteria below were derived from the issues, the business requirements, and the requirement analyses for these issues. Each one keeps its original ID in brackets.

**Missing accounts (#1)**
- AC-1 — A Send Money request without a sender account is rejected as a bad request. *(SM-H01 AC-1)*
- AC-2 — A Send Money request without a receiver account is rejected as a bad request. *(SM-H01 AC-2)*
- AC-3 — After such a rejection, the service still answers its health check normally. *(SM-H01 AC-3)*
- AC-4 — After such a rejection, other users' requests are still served. *(SM-H01 AC-4)*
- AC-5 — A request rejected under AC-1 or AC-2 moves no money and adds no statement entry. *(SM-H01 AC-5)*

**Daily and monthly limits under concurrency (#2)**
- AC-6 — A customer completes at most 10 outgoing transactions per UTC day, even when the requests are sent at the same moment. *(SM-H02 AC-1)*
- AC-7 — When requests arrive together and only N transactions remain, exactly N succeed and the rest get the daily-limit message. *(SM-H02 AC-2)*
- AC-8 — A limit rejection is a bad request. It names the period whose limit was reached and shows the used and remaining count and amount. *(SM-H02 AC-3)*
- AC-9 — A customer cannot send more than 5,000 Tk per UTC day, fees included, even when the requests are sent at the same moment. *(SM-H02 AC-4)*
- AC-10 — The monthly limits (50 transactions, 50,000 Tk) hold in the same way. *(SM-H02 AC-5)*
- AC-11 — A limit rejection moves no money and adds no statement entry. *(SM-H02 AC-6)*
- AC-12 — Send Money, Payment and Cash Out together count toward one shared limit. *(SM-H02 AC-7)*

**Sending to your own account (#3)**
- AC-13 — A customer who enters their own number as the receiver is told "From account and to account cannot be the same", and the transfer does not happen. *(SM-M01 AC-1)*
- AC-14 — AC-13 also applies when the customer's own number has spaces before or after it. *(SM-M01 AC-2)*
- AC-15 — AC-13 also applies to any other way of writing the number that the system resolves to the sender's own account. *(SM-M01 AC-3)*
- AC-16 — A transfer rejected under AC-13 to AC-15 leaves the balance unchanged, and no fee is charged. *(SM-M01 AC-4)*
- AC-17 — A transfer rejected under AC-13 to AC-15 adds no statement entry. *(SM-M01 AC-5)*
- AC-18 — The API reports a rejection under AC-13 to AC-15 as a bad request. *(SM-M01 AC-6)*
- AC-19 — A different customer's number padded with spaces is accepted, and the transfer goes through. *(SM-M01 AC-7)*
- AC-20 — In AC-19, the receiver's statement shows the credit under their normal phone number. *(SM-M01 AC-8)*

**Decimal places (#4)**
- AC-21 — The Send Money page rejects an amount with more than two decimal places before anything is sent, and explains the rule. *(SM-M02 AC-1, provisional)*
- AC-22 — The API rejects an amount with more than two decimal places as a bad request. *(SM-M02 AC-2, provisional)*
- AC-23 — An amount rejected under AC-21 or AC-22 moves no money and adds no statement entry. *(SM-M02 AC-3, provisional)*
- AC-24 — For an amount with up to two decimal places, the receipt shows exactly the amount the receiver was credited. *(SM-M02 AC-4)*
- AC-25 — For an amount with up to two decimal places, the sender's statement debit is exactly the amount plus the 5 BDT fee. *(SM-M02 AC-5)*

**Non-numeric amounts (#5)**
- AC-26 — An amount written in hexadecimal is rejected as a bad request with "Amount must be a valid number greater than 0". *(SM-L01 AC-1)*
- AC-27 — An amount written in scientific notation is rejected the same way. *(SM-L01 AC-2)*
- AC-28 — An amount sent as a list is rejected the same way. *(SM-L01 AC-3)*
- AC-29 — A request rejected under AC-26 to AC-28 leaves both balances unchanged. *(SM-L01 AC-4)*
- AC-30 — A request rejected under AC-26 to AC-28 adds no statement entry for either account. *(SM-L01 AC-5)*
- AC-31 — A plain numeric amount of at least the minimum is still accepted, and exactly that amount is transferred. *(SM-L01 AC-6)*

**Receipt (#6)**
- AC-32 — After a successful send, the receipt shows the amount the receiver gets. *(SM-L02 AC-1, provisional)*
- AC-33 — The receipt shows the service fee that was charged. *(SM-L02 AC-2, provisional)*
- AC-34 — The receipt's Total Amount equals the sender's statement debit for that transaction. *(SM-L02 AC-3, provisional)*
- AC-35 — Each amount on the receipt is labelled so a customer can tell the amount sent, the fee and the total apart. *(SM-L02 AC-4, provisional)*

**Non-text accounts (#7)**
- AC-36 — A request whose receiver is not given as text is rejected as a bad request. *(SM-L03 AC-1)*
- AC-37 — A request whose sender is not given as text is rejected as a bad request. *(SM-L03 AC-2)*
- AC-38 — The response to such a rejection contains no internal system or framework detail. *(SM-L03 AC-3)*
- AC-39 — A request rejected under AC-36 or AC-37 leaves the balances unchanged. *(SM-L03 AC-4)*
- AC-40 — A request rejected under AC-36 or AC-37 adds no statement entry. *(SM-L03 AC-5)*
- AC-41 — When Send Money fails for an internal reason, the response says only that an internal error happened. *(SM-L03 AC-6)*

## 3. Basic Test — verify the feature works end to end

Run this first. If it fails, stop and report it instead of starting the TC cases.

**Environment preconditions**
- The API runs from the PR #8 branch at http://localhost:5000, and `GET http://localhost:5000/` returns `{"message":"Server is up"}`.
- The web app runs at http://localhost:3000 and is configured to call the API at http://localhost:5000 with the partner key `ROADTOSDET`. If it isn't, the login screen falls back to the wrong address and login fails.
- The local dMoney database is loaded, and both Customer 1 (`01686606902`) and Customer 2 (`01686606903`) are active.
- Customer 2 has a balance of at least 25 Tk and has made fewer than 10 outgoing transactions today (UTC). Otherwise the walkthrough stops at an insufficient-balance or daily-limit message.
- Customer 1's balance has been noted with `GET /transaction/balance/01686606902`.

**Login and role**
- Customer 2: `salmansrabon+customer2@gmail.com`, password `1234`, using the dev OTP bypass (OTP `0000`).

**Steps**
1. Open http://localhost:3000/login?env=dev. → The screen says "Welcome Back" and "Sign in to your dMoney account".
2. Enter `salmansrabon+customer2@gmail.com` in **Email or Phone Number** and `1234` in **Password**, then click **Login →**. → The screen changes to "Verify Your Identity".
3. Enter `0000` in **Enter 4-Digit OTP** and click **Verify OTP →**. → The Profile page opens, with the customer menu on the left.
4. Click **Send Money** in the left menu. → The page shows the heading "Send Money" and the text "Transfer funds to another customer instantly".
5. Enter `01686606902` in **Receiver Phone Number** and `20` in **Amount (BDT)**, then click **Send Money →**. → The button briefly shows "Sending…".
6. Read the green receipt. → It shows "Send money successful" and a Transaction ID. It then shows four amounts, labelled in capitals: AMOUNT SENT ৳ 20.00, SERVICE FEE ৳ 5.00, TOTAL AMOUNT ৳ 25.00, and REMAINING BALANCE (the earlier balance minus 25).
7. Click **Self Statement** in the left menu. → The new transaction ID is listed with a debit of 25.
8. Call `GET /transaction/balance/01686606902` again. → Customer 1's balance is exactly 20 higher than the value noted before step 1.

**What proves it passed:** the money arrived, the receipt total matches what the statement shows was debited, and Customer 1's balance went up by exactly 20.

## 4. System Behavior Tests

All cases use the API at http://localhost:5000. Every API call sends `Authorization: Bearer <token of the logged-in customer>`, `X-AUTH-SECRET-KEY: ROADTOSDET` and `Content-Type: application/json`, unless the case says otherwise. Get a token with `POST /user/login` (email + password `1234`), then `POST /user/verify-otp?env=dev` with OTP `0000`.

Daily limits reset at 00:00 UTC. "Outgoing transactions today" means the customer's Send Money, Payment and Cash Out debits since 00:00 UTC, counted from their statement.

### 4a. New behavior

### TC-001

**Test Title:** Verify that the service turns away a Send Money request with a missing account and keeps serving everyone
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 (`01686606902`) and Customer 2 (`01686606903`) are logged in, and their tokens are ready.
- Both balances are noted with `GET /transaction/balance/01686606902` and `GET /transaction/balance/01686606903`.
- Customer 2 has at least 15 Tk and has made fewer than 10 outgoing transactions today (UTC), for step 3.

**Test Data:**
- Sender missing: `{"to_account":"01686606903","amount":20}`, and the same body with `"from_account": null`, `""` and `"   "`.
- Receiver missing: `{"from_account":"01686606902","amount":20}`, and the same body with `"to_account": null`, `""` and `"   "`.

**Steps:**
1. As Customer 1, send each Test Data body to `POST /transaction/sendmoney`.
2. After each request, call `GET /`.
3. As Customer 2, send a normal request: `POST /transaction/sendmoney` with `{"from_account":"01686606903","to_account":"01686606902","amount":10}`.
4. Check both balances and both statements.

**Expected Result:**
- Every sender-missing variant returns **400** `{"message":"from_account is required and must be a string"}`.
- Every receiver-missing variant returns **400** `{"message":"to_account is required and must be a string"}`.
- No request ends with a dropped connection or an empty reply.
- `GET /` returns `{"message":"Server is up"}` after every request.
- Customer 2's request returns **201** "Send money successful".
- Apart from Customer 2's transfer in step 3, both balances are unchanged, and the statements show no other new entries.

### TC-002

**Test Title:** Verify that only the remaining daily transactions go through when a customer sends many at the same moment
**Type:** Functional / Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has made **0** outgoing transactions today (UTC). If Customer 1 has already used today's transactions, run on a new UTC day or use another customer, and adjust the phone number.
- Customer 1 has made at most **40** outgoing transactions this month, so the monthly limit cannot trip first.
- Customer 1 has a balance of at least 210 Tk.
- Customer 2 is active.
- A shell is available that can send 14 requests in parallel.

**Test Data:**
- Body: `{"from_account":"01686606902","to_account":"01686606903","amount":10}`.
- 14 parallel requests, then 1 more on its own.

**Steps:**
1. Note Customer 1's balance.
2. Send the body to `POST /transaction/sendmoney` 14 times at the same moment.
3. When all 14 have answered, send the body once more.
4. Check Customer 1's balance and statement.

**Expected Result:**
- Exactly **10** of the 14 requests return **201** "Send money successful".
- The other **4** return **400**, each with the message "Daily transaction limit reached. You have used all 10 allowed transactions for this daily period." and `details` showing `"period":"daily"`, `"usedCount":10`, `"maxCount":10`, `"remainingCount":0`.
- The extra request in step 3 returns the same 400.
- The balance went down by exactly **150** (10 × (10 + 5 fee)).
- The statement shows exactly 10 new Send Money debits. The rejected requests left no trace.
- Variant: a customer at **9** transactions who sends 2 at the same moment gets exactly one 201 and one 400.

### TC-003

**Test Title:** Verify that the daily 5,000 Tk spending limit holds when large sends arrive together
**Type:** Functional / Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 2 (`01686606903`) has spent **0 Tk** in outgoing transactions today (UTC) and has a balance of at least 6,100 Tk. Top up through an Agent deposit if needed; the wallet holds at most 10,000 Tk.
- This month Customer 2 has made at most **47** outgoing transactions and spent at most **43,985 Tk**, so the monthly limits cannot trip first.
- The receiver is Customer 1 (`01686606902`), who is active.

**Test Data:**
- Body: `{"from_account":"01686606903","to_account":"01686606902","amount":2000}`, sent 3 times in parallel. Each send costs 2,005 Tk with the fee.

**Steps:**
1. Note the sender's balance.
2. Send the body to `POST /transaction/sendmoney` 3 times at the same moment.
3. Check the sender's balance and statement.

**Expected Result:**
- Exactly **2** requests return **201**.
- Exactly **1** returns **400** with the message "Daily amount limit exceeded. You can spend at most 990.00 Tk more (incl. fees) this daily period (limit: 5000 Tk, used: 4010.00 Tk)." and `details` showing `"usedAmount":4010`. *(This wording comes from the PR code; the business requirements give a different sample wording, see PR-8.review.md E2.)*
- The balance went down by exactly **4,010**, and the statement shows exactly 2 new debits of 2,005.

### TC-004

**Test Title:** Verify that the monthly transaction limit holds when sends arrive together
**Type:** Functional / Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- A customer has made **49** outgoing transactions this month (UTC), built up over earlier days, with **at most 7** of them today. That way the daily limit cannot trip first.
- The customer has a balance of at least 45 Tk.

**Test Data:**
- Body: `{"from_account":"<phone of the customer above>","to_account":"01686606903","amount":10}`, sent 3 times in parallel. If the customer above is Customer 2, use `01686606902` as the receiver.

**Steps:**
1. Send the body to `POST /transaction/sendmoney` 3 times at the same moment.
2. Check the sender's statement.

**Expected Result:**
- Exactly **1** request returns **201**.
- **2** return **400** with "Monthly transaction limit reached. You have used all 50 allowed transactions for this monthly period." and `details` showing `"period":"monthly"`, `"maxCount":50`.
- The statement shows exactly 1 new debit, and the month's total is 50.

### TC-005

**Test Title:** Verify that Send Money and Payment share one daily limit when sent at the same moment
**Type:** Functional / Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has made **0** outgoing transactions today (UTC) and at most **38** this month. Use another customer on a day when Customer 1 has already used today's transactions.
- Customer 1 has a balance of at least 720 Tk.
- Customer 2, the Merchant `01686606905` and the Agent `01686606901` are active. The other "Test Merchant" and "Test Agent" accounts are pending; don't use them.

**Test Data:**
- 6 × Send Money: `POST /transaction/sendmoney` with `{"from_account":"01686606902","to_account":"01686606903","amount":10}`.
- 6 × Payment: `POST /transaction/payment` with `{"from_account":"01686606902","to_account":"01686606905","amount":100}`.
- Cash Out variant: replace the 6 Payments with 6 × `POST /transaction/withdraw` with `{"from_account":"01686606902","to_account":"01686606901","amount":100}`.

**Steps:**
1. Send all 12 requests (6 Send Money + 6 Payment) at the same moment.
2. Count the 201 responses across both kinds, and check Customer 1's statement.
3. On a new UTC day, or with another customer at 0, repeat with the Cash Out variant.

**Expected Result:**
- Exactly **10** of the 12 requests return **201**, counting both kinds together.
- The other **2** return **400** "Daily transaction limit reached. You have used all 10 allowed transactions for this daily period."
- The statement shows exactly **10** outgoing transactions for the day.
- The Cash Out variant behaves the same way.
- *Note: a defect is suspected here; see PR-8.review.md (E7, BC-1).*

### TC-006

**Test Title:** Verify that the daily-limit message comes before the low-balance message when both apply
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- A customer has made **10** outgoing transactions today (UTC), and their balance is below 25 Tk (for example 12 Tk). To prepare one, fund a new customer with about 162 Tk and send ten transfers of 10 Tk to another customer.

**Test Data:**
- Body: `{"from_account":"<phone of the customer above>","to_account":"01686606903","amount":20}`. If the customer above is Customer 2, use `01686606902` as the receiver.

**Steps:**
1. Send the body to `POST /transaction/sendmoney`.

**Expected Result:**
- The response is **400** with the daily-limit message and `details`, because the business requirement says limits are checked first. *(Sources conflict: the PR checks the balance first and would return 208 "Insufficient balance"; see PR-8.review.md E2.)*
- Nothing is debited.

### TC-007

**Test Title:** Verify that a customer cannot send money to their own number entered with extra characters on the Send Money page
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 2 is logged in to the web app (see the Basic Test) and has at least 25 Tk.
- The balance is noted.

**Test Data:**
- **Receiver Phone Number** values: `01686606903 ` (trailing space), ` 01686606903` (leading space), and `01686606903` followed by an invisible zero-width space (paste it from a prepared text file).
- **Amount (BDT)**: `20`.

**Steps:**
1. Open **Send Money**.
2. Enter one receiver value and the amount, then click **Send Money →**.
3. Read the message, then repeat steps 2–3 for each receiver value.
4. Open **Self Statement** and check the balance.

**Expected Result:**
- Every value shows the red message "From account and to account cannot be the same", and no receipt appears.
- The balance is unchanged, no 5 Tk fee is taken, and the statement shows no new entry.
- *Note: a defect is suspected for the zero-width-space value; see PR-8.review.md (E7, BC-2).*

### TC-008

**Test Title:** Verify that the API refuses a transfer to the sender's own number however it is written
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 is logged in and has at least 50 Tk and at least 2 transactions of quota left today.
- The balance is noted.

**Test Data:**
- `from_account` is `"01686606902"`, and `amount` is `20`.
- `to_account` takes each of these values:
  - `"01686606902"`
  - `"01686606902 "` (trailing space)
  - `" 01686606902"` (leading space)
  - `"01686606902​"` (zero-width space)
  - `"０1686606902"` (full-width first digit)
- Sender-side variant: `{"from_account":"01686606902\u200b","to_account":"01686606902","amount":20}`, where the sender has a zero-width space and the receiver is plain.

**Steps:**
1. Send each body to `POST /transaction/sendmoney`.
2. Check the balance and statement.

**Expected Result:**
- Every variant, including the sender-side variant, returns **400** `{"message":"From account and to account cannot be the same"}`.
- The balance is unchanged, no fee is charged, and the statement shows no new entry.
- *Note: a defect is suspected for the zero-width-space and full-width variants, including on the sender side; see PR-8.review.md (E7, BC-2).*

### TC-009

**Test Title:** Verify that money sent to another customer's number padded with spaces reaches that customer
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has at least 50 Tk and at least 2 transactions of quota left.
- Both balances are noted.

**Test Data:**
- API: `{"from_account":"01686606902","to_account":"  01686606903 ","amount":20}`.
- Web variant: logged in as Customer 1, enter **Receiver Phone Number** `01686606903 ` and **Amount (BDT)** `20`.

**Steps:**
1. Send the API body to `POST /transaction/sendmoney`.
2. Check Customer 2's balance and statement (`GET /transaction/statement/01686606903`).
3. Repeat with the web variant.

**Expected Result:**
- Each send returns **201** "Send money successful" (the web shows the green receipt).
- Customer 2's balance rises by exactly **20** per send, and Customer 1's falls by **25**.
- Customer 2's new statement entry is recorded under account `01686606903`, exactly 11 characters with no surrounding spaces. Confirm with an approved database check if the statement view hides spaces.

### TC-010

**Test Title:** Verify that the Send Money page blocks an amount with more than two decimal places
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 2 is logged in to the web app, with the browser's Network panel open.

**Test Data:**
- **Receiver Phone Number** `01686606902`.
- **Amount (BDT)** `10.555`, then `10.5555`.

**Steps:**
1. Open **Send Money** and enter the receiver and the first amount.
2. Click **Send Money →**.
3. Repeat with the second amount.

**Expected Result:**
- Under the amount field, the message "Amount can have at most 2 decimal places." appears.
- No send-money request appears in the Network panel, and the balance is unchanged.

### TC-011

**Test Title:** Verify that the API refuses an amount with more than two decimal places
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 is logged in and the balance is noted.

**Test Data:**
- `{"from_account":"01686606902","to_account":"01686606903","amount":10.555}`.
- The same body with `"amount":"10.555"`.

**Steps:**
1. Send each body to `POST /transaction/sendmoney`.
2. Check both balances and statements.

**Expected Result:**
- Each returns **400**. The requirement doesn't set the message (Q-5); in the PR code it is "Amount must be a valid number greater than 0 with at most 2 decimal places".
- No money moves, and no statement entry is added.

### TC-012

**Test Title:** Verify that an amount with two decimal places is moved exactly
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has at least 16 Tk and quota left.
- Both balances are noted.

**Test Data:**
- `{"from_account":"01686606902","to_account":"01686606903","amount":10.55}`.

**Steps:**
1. Send the body to `POST /transaction/sendmoney`.
2. Check both statements for the returned transaction ID.

**Expected Result:**
- The response is **201** with `"fee":5`.
- Customer 1's debit is exactly **15.55**, and Customer 2's credit is exactly **10.55**. Neither value has a third decimal.
- The balances change by exactly −15.55 and +10.55. Compare to 2 decimal places, because the balance service rounds to 2 places.

### TC-013

**Test Title:** Verify that 10 Tk can be sent but 9.99 Tk is refused as below the minimum
**Type:** Functional / Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has at least 40 Tk and at least 2 transactions of quota left.

**Test Data:**
- `"amount": 9.99`, `"amount": 10` and `"amount": "10.00"`, each with `from_account` `01686606902` and `to_account` `01686606903`.

**Steps:**
1. Send each body to `POST /transaction/sendmoney`.

**Expected Result:**
- `9.99` returns **400** "Minimum amount is 10 tk", and nothing is debited.
- `10` and `"10.00"` each return **201**, with a debit of **15** for each.

### TC-014

**Test Title:** Verify that the API refuses amounts that are not plain numbers
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 is logged in and both balances are noted.

**Test Data:**
- `from_account` `01686606902` and `to_account` `01686606903`.
- `amount` takes each of: `"0x10"`, `"1e1"`, `[20]`, `true`, `{}`, `"abc"`, `-5`, `"Infinity"`, `0`.
- Unquoted scientific notation: the raw body `{"from_account":"01686606902","to_account":"01686606903","amount":1e1}`.

**Steps:**
1. Send each body to `POST /transaction/sendmoney`.
2. Check both balances and statements.

**Expected Result:**
- Every variant returns **400** with exactly `{"message":"Amount must be a valid number greater than 0"}`.
- Neither balance changes, and no statement entry is added.
- *Note: a defect is suspected in the message wording (BC-3) and for the unquoted `1e1` variant (BC-5); see PR-8.review.md E7. Unquoted `1e1` may be impossible to tell apart from `10` once the request is read.*

### TC-015

**Test Title:** Verify that plain numeric amounts sent as text are still accepted
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has at least 75 Tk and at least 3 transactions of quota left.

**Test Data:**
- `"amount": "20"`, `"amount": 20.0` and `"amount": " 20 "`, each with `from_account` `01686606902` and `to_account` `01686606903`.

**Steps:**
1. Send each body to `POST /transaction/sendmoney`.

**Expected Result:**
- `"20"` and `20.0` each return **201**, with exactly 20 credited and 25 debited.
- `" 20 "` (spaces around the number): the outcome is TBD — not established by the requirement; see PR-8.review.md Q-4.

### TC-016

**Test Title:** Verify that the receipt shows the amount sent, the fee and the total debited after a send
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 2 is logged in to the web app, with at least 45 Tk and 2 transactions of quota left.

**Test Data:**
- **Receiver Phone Number** `01686606902`.
- **Amount (BDT)** `20`, then `10.55`.

**Steps:**
1. Open **Send Money**, enter the receiver and `20`, and click **Send Money →**.
2. Read the receipt and note the Transaction ID.
3. Repeat with `10.55`.
4. Check `GET /transaction/statement/01686606903`, `GET /transaction/balance/01686606903` and the receiver's statement `GET /transaction/statement/01686606902`.

**Expected Result:**
- For `20`, the receipt shows AMOUNT SENT ৳ 20.00, SERVICE FEE ৳ 5.00 and TOTAL AMOUNT ৳ 25.00.
- For `10.55`, the receipt shows ৳ 10.55, ৳ 5.00 and ৳ 15.55.
- Each TOTAL AMOUNT equals the sender's statement debit for that Transaction ID.
- Each AMOUNT SENT equals Customer 1's credit for that Transaction ID (20 and 10.55).
- REMAINING BALANCE equals the balance returned by the API.
- Each amount has its own label. *(Provisional: the business has not yet confirmed the meaning of "Total Amount"; see PR-8.review.md Q-3.)*

### TC-017

**Test Title:** Verify that the API turns away accounts sent in a non-text form without exposing internal details
**Type:** Negative / Security — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has quota left today, a balance of at least 25 Tk, and Customer 2 is active. These are the conditions under which the original fault appeared.
- Both balances are noted.

**Test Data:**
- `{"from_account":"01686606902","to_account":["01686606903"],"amount":20}`
- `{"from_account":"01686606902","to_account":{"a":1},"amount":20}`
- `{"from_account":"01686606902","to_account":1686606903,"amount":20}`
- `{"from_account":["01686606902"],"to_account":"01686606903","amount":20}`
- Form-encoded: `from_account=01686606902&to_account[]=01686606903&amount=20`, sent with `Content-Type: application/x-www-form-urlencoded`.

**Steps:**
1. Send each body to `POST /transaction/sendmoney`.
2. Call `GET /`.
3. Check both balances and statements.

**Expected Result:**
- The non-text receiver variants return **400** `{"message":"to_account is required and must be a string"}`.
- The non-text sender variant returns **400** `{"message":"from_account is required and must be a string"}`.
- No response contains any technical text, such as validation internals, stack traces or database wording. Each body holds only the message.
- `GET /` returns "Server is up".
- No money moves, and no statement entry is added.

### 4b. Related regression

### TC-018

**Test Title:** Verify that the existing Send Money business rules still turn away invalid transfers
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 is logged in and has made **fewer than 10** outgoing transactions today (UTC), so the daily limit doesn't answer first.
- The active Agent is `01686606901`.
- An inactive customer account exists; an administrator sets it to inactive.

**Test Data:**
- All variants use `"amount":20` unless stated.
- Receiver is the Agent: `"to_account":"01686606901"`.
- Unknown receiver: `"to_account":"01999999999"`.
- Inactive receiver: `"to_account":"<inactive customer phone>"`.
- Low balance: an `amount` with at most 2 decimals that is at least 10 and more than Customer 1's balance minus 5. For example, with a balance of 7164.50, use `7160.00`.

**Steps:**
1. Send each body, with `"from_account":"01686606902"`, to `POST /transaction/sendmoney`.

**Expected Result:**
- Agent receiver: **400** "Send money is only allowed between two Customer accounts".
- Unknown receiver: **404** "To Account does not exist".
- Inactive receiver: **403** "Receiver account is not active. Please contact admin."
- Low balance: **208** "Insufficient balance", with `currentBalance` equal to the current balance.
- No money moves in any variant.

### TC-019

**Test Title:** Verify that a customer cannot send money from another customer's account
**Type:** Security / Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 is logged in.
- Customer 2's balance is noted.

**Test Data:**
- `{"from_account":"01686606903","to_account":"01686606902","amount":20}` with Customer 1's token.
- The same with `"from_account":" 01686606903 "`.
- The same request with no `Authorization` header.

**Steps:**
1. Send each request to `POST /transaction/sendmoney`.
2. Check Customer 2's balance.

**Expected Result:**
- With Customer 1's token, both variants return **403** "Unauthorized: you can only initiate transactions from your own account".
- Without a token, the request returns **401** "No Token Found!".
- Customer 2's balance is unchanged.

### TC-020

**Test Title:** Verify that customer Payment still works and still respects the shared daily limit
**Type:** Functional / Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has fewer than 10 outgoing transactions today and at least 105 Tk.
- The Merchant `01686606905` is active.
- For the limit variant, a customer has made **10** outgoing transactions today, for example Customer 1 right after TC-002.

**Test Data:**
- **Payment** page (`/customer/payment`), or `POST /transaction/payment` with `{"from_account":"01686606902","to_account":"01686606905","amount":100}`.

**Steps:**
1. Make the payment.
2. Make the same payment as the customer who is at 10 transactions.

**Expected Result:**
- The payment returns **201** "Payment successful", and Customer 1 is debited **105** (100 + a fee of 1%, with a 5 Tk minimum).
- At 10 transactions, the payment returns **400** "Daily transaction limit reached. You have used all 10 allowed transactions for this daily period." with `details`, and nothing is debited.

### TC-021

**Test Title:** Verify that customer Cash Out still works and still respects the shared daily limit
**Type:** Functional / Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Customer 1 has fewer than 10 outgoing transactions today and at least 105 Tk.
- The Agent `01686606901` is active.
- For the limit variant, a customer has made **10** outgoing transactions today, for example Customer 1 right after TC-002.

**Test Data:**
- **Cash Out** page (`/customer/cash-out`), or `POST /transaction/withdraw` with `{"from_account":"01686606902","to_account":"01686606901","amount":100}`.

**Steps:**
1. Make the cash out.
2. Make the same cash out as the customer who is at 10 transactions.

**Expected Result:**
- The cash out returns **201** "Withdraw successful", and Customer 1 is debited **105**.
- At 10 transactions, it returns **400** with the daily-limit message and `details`, and nothing is debited.

### TC-022

**Test Title:** Verify that agents and merchants are not held to the customer daily limit
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The Agent `01686606901` and the Merchant `01686606905` are active.
- The Agent has at least 1,155 Tk for 11 payments of 100 plus fees.
- The Merchant gets the money for its cash outs from the agent payments in step 1.

**Test Data:**
- Agent: **Payment** page (`/agent/payment`), or `POST /transaction/payment` with `{"from_account":"01686606901","to_account":"01686606905","amount":100}`.
- Merchant: **Cash Out** page (`/merchant/cash-out`), or `POST /transaction/withdraw` with `{"from_account":"01686606905","to_account":"01686606901","amount":10}`.

**Steps:**
1. As the Agent, make the payment **11** times, one after another.
2. As the Merchant, make the cash out **11** times, one after another.

**Expected Result:**
- All 11 agent payments return **201** "Payment successful".
- All 11 merchant cash outs return **201** "Withdraw successful".
- No response is a daily-limit message, even after 10 transactions.

### TC-023

**Test Title:** Verify that transfers from many customers at the same moment all complete correctly
**Type:** Performance / Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Four funded customers with quota left. An administrator creates them, and an Agent deposits at least 200 Tk to each.
- Customer 1 and Customer 2 each have at least 210 Tk and at least 2 transactions of quota left today.
- The Merchant `01686606905` and the Agent `01686606901` are active.

**Test Data:**
- At the same moment: 4 Send Money requests (each new customer sends 10 Tk to Customer 1), 2 Payments of 100 (Customers 1 and 2 to the Merchant), and 2 Cash Outs of 100 (Customers 1 and 2 to the Agent).

**Steps:**
1. Fire all 8 requests in parallel.
2. Check each sender's statement.
3. With an approved database check, compare each **Send Money** transaction ID's total debits with its total credits.

**Expected Result:**
- All 8 return **201**, and none returns 500.
- Each sender is debited exactly once with the expected amount and fee.
- For every Send Money transaction ID, total debits equal total credits (sender debit = receiver credit + 5 Tk fee).
- Payment and Cash Out entries follow their existing ledger rules, which this PR doesn't change. For example, a Cash Out's credits exceed its debit by the 2.5% agent commission.
- Response time: TBD — not established by available evidence. Record the slowest response for the review.

## 5. White-box Tests

No additional whitebox tests are justified.

## 6. Coverage Summary

**Acceptance criteria → cases**

| AC | Covered by |
|---|---|
| AC-1, AC-2 | TC-001 |
| AC-3, AC-4 | TC-001 (also the `GET /` checks in TC-017) |
| AC-5 | TC-001 |
| AC-6, AC-7 | TC-002 |
| AC-8 | TC-002, TC-003, TC-004 |
| AC-9 | TC-003 |
| AC-10 | TC-004 (count only; the amount part is not covered, see below) |
| AC-11 | TC-002, TC-003 |
| AC-12 | TC-005; regression of the shared limit in TC-020, TC-021 |
| AC-13 to AC-18 | TC-007 (web), TC-008 (API) |
| AC-19, AC-20 | TC-009 |
| AC-21 | TC-010 |
| AC-22 | TC-011 |
| AC-23 | TC-010, TC-011 |
| AC-24 | TC-016 (receipt vs the receiver's credit) |
| AC-25 | TC-012 |
| AC-26 to AC-30 | TC-014 |
| AC-31 | TC-015, TC-013 |
| AC-32 to AC-35 | TC-016 |
| AC-36 to AC-40 | TC-017 |
| AC-41 | **No case**, see Not covered |

**Other coverage**
- **Changed outcomes covered:**
  - New validation rejections: TC-001, TC-011, TC-014, TC-017.
  - Limit checked inside the lock: TC-002, TC-003, TC-004, TC-005.
  - Check order: TC-006.
  - Trimming: TC-007, TC-008, TC-009.
  - Decimal rule: TC-010 to TC-013.
  - Receipt: TC-016.
- **Related caller groups covered:**
  - Customer Payment: TC-020.
  - Customer Cash Out: TC-021.
  - Agent Payment and Merchant Cash Out: TC-022.
  - Simultaneous mixed traffic: TC-023.
- **Validation and authorization:** TC-001, TC-014, TC-017, TC-018, TC-019.
- **Boundaries:** the 10 Tk minimum (TC-013); 0 / 9 / 10 daily transactions (TC-002, TC-005, TC-006, TC-022); 5,000 Tk per day (TC-003); 49 / 50 per month (TC-004); two vs three decimals (TC-010 to TC-012).
- **Compatibility:** numeric amounts sent as text (TC-015).
- **Duplicates merged:**
  - The variants for missing, null and empty accounts are in TC-001.
  - All own-number spellings are in TC-007 and TC-008.
  - All non-plain amount forms are in TC-014.
  - Both receipt amounts are in TC-016.

**Not covered**
- **AC-41** (the response for an internal failure): it can only be triggered by forcing a database or infrastructure failure, which has no supported test path.
- **AC-10, monthly amount limit (50,000 Tk):** it needs at least 45,000 Tk of outgoing spend in one month. The wallet holds at most 10,000 Tk, so this is impractical within a sanity cycle.
- **A burst of requests across 00:00 UTC:** this depends on timing and isn't repeatable on demand. It's covered as exploratory work in the PR #8 test charter (CH-1).
- **The other four receipt pages that use "Total Amount":** they're unchanged and outside this PR.

## 7. Top Test Cases — black-box quick list

**Send Money: missing or bad input**
- Verify that a send with no sender or no receiver is turned away and the service keeps working for everyone.
- Verify that accounts given as lists or objects are turned away without showing technical details.
- Verify that amounts written as hex, as scientific notation, as a list or as zero are turned away with the standard amount message.
- Verify that amounts with more than two decimals are blocked on the page and refused by the service.

**Send Money: limits**
- Verify that only the remaining daily transactions go through when many sends arrive together.
- Verify that the daily 5,000 Tk spending limit holds when large sends arrive together.
- Verify that Send Money and Payment, or Send Money and Cash Out, sent together still respect one shared daily limit.
- Verify that the monthly transaction limit holds when sends arrive together.
- Verify that a customer over the daily limit with a low balance sees the daily-limit message.

**Send Money: accounts and amounts**
- Verify that a customer cannot send money to their own number written with spaces or invisible characters, in either the sender or receiver field.
- Verify that money sent to another customer's number padded with spaces reaches that customer.
- Verify that a two-decimal amount is moved exactly.
- Verify that 10 Tk can be sent but 9.99 Tk is refused.
- Verify that plain numeric amounts sent as text still work.

**Send Money: receipt**
- Verify that the receipt shows the amount sent, the fee and a total that matches the statement.

**Related flows**
- Verify that the existing Send Money rules still turn away transfers to agents, unknown or inactive receivers, and transfers without enough balance.
- Verify that a customer cannot send money from another customer's account.
- Verify that customer Payment and Cash Out still work and stop at the daily limit.
- Verify that agents and merchants are not held to the customer daily limit.
- Verify that transfers from many customers at the same moment all complete correctly.
