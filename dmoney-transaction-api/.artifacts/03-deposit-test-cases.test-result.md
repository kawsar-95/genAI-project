# Test Result — 03-deposit-test-cases

- **Test file:** /home/nuruddin-kawsar/Documents/r2sdet_AI/dmoney-transaction-api/qa-findings/03-deposit-test-cases.md
- **Executed on:** 2026-10-04
- **Environment:** Backend http://localhost:5000, Frontend http://localhost:3000
- **Scope:** First 5 High priority test cases from section 3 as requested by the user (TC-001, TC-002, TC-011, TC-013, TC-017); Stripe cases excluded at the user's request

## Summary

| Total | Pass | Failed | Not executed |
|---|---|---|---|
| 23 | 4 | 0 | 19 |

## Results

| Test Case Id | Test Title | Expected Result | Actual Result | Test Result |
|---|---|---|---|---|
| TC-001 | Verify Agent deposit to Customer with valid amount | HTTP 201 with `message` "Deposit successful", a `trnxId`, and `commission` 12.5.<br>Customer 1's balance increased by exactly 500 BDT. | POST /transaction/deposit returned 201 `{"message":"Deposit successful","trnxId":"TXN3UCA69JZ43","commission":12.5}`. Customer 1 balance went from 6150.5 to 6650.5 (+500). | pass |
| TC-002 | Verify Agent commission on a Customer deposit | Response `commission` is 25.<br>Agent's balance decreased by 975 (`1000 - 25`), not 1000. | POST /transaction/deposit returned 201 with `commission` 25. Agent balance went from 26158.25 to 25183.25 (-975). | pass |
| TC-003 | Verify deposit with amount below minimum limit | HTTP 400 with `{"message":"Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"}`.<br>No balance change for either account. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-004 | Verify deposit with amount above maximum limit | HTTP 400 with `{"message":"Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"}`.<br>No balance change for either account. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-005 | Verify deposit to Customer already at maximum wallet cap | HTTP 208 with `{"message":"Limit exceeded. You cannot deposit any more to this account."}`.<br>QA-CUST-1's balance stays 10000. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-006 | Verify deposit exceeding remaining wallet cap | HTTP 208 with `{"message":"Limit exceeded. You can deposit a maximum of 100.00 tk to this customer."}`.<br>QA-CUST-2's balance stays 9900. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-007 | Verify deposit by Agent with zero balance | HTTP 208 with `{"message":"Insufficient balance","currentBalance":0}`.<br>Customer 1's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-008 | Verify deposit with another Agent's phone as from_account | HTTP 403 with `{"message":"Unauthorized: you can only initiate transactions from your own account"}`.<br>No balance change on any account. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-009 | Verify deposit initiated by Customer role | HTTP 400 with `{"message":"Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit."}`.<br>No balance change on any account. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-010 | Verify deposit with identical from and to accounts | HTTP 400 with `{"message":"From account and to account cannot be the same"}`.<br>Agent's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-011 | Verify SYSTEM deposit to a regular Agent | HTTP 201 with `message` "SYSTEM deposit to Agent successful" and an `agentBalance` field.<br>Agent's balance increased by exactly 5000 (no commission). | POST /transaction/deposit returned 201 `{"message":"SYSTEM deposit to Agent successful","trnxId":"TXNZ3WI5GWB1Y","amount":5000,"agentBalance":30183.25}`. Agent balance went from 25183.25 to 30183.25 (+5000). | pass |
| TC-012 | Verify SYSTEM deposit to Customer account | HTTP 400 with `{"message":"SYSTEM account can only deposit to a regular Agent account. Customer and Merchant accounts are not allowed."}`.<br>Customer 1's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-013 | Verify Admin deposit to SYSTEM account | HTTP 201 with `{"message":"Deposit to SYSTEM account successful","amount":100000}`.<br>SYSTEM's balance increased by 100000. | POST /transaction/adminDeposit returned 201 `{"message":"Deposit to SYSTEM account successful","trnxId":"TXNASF6MRGGRE","amount":100000}`. SYSTEM balance went from 9851483.5 to 9951483.5 (+100000). | pass |
| TC-014 | Verify adminDeposit access with Customer role | HTTP 403 with `{"message":"Only Admin can use this deposit endpoint"}`.<br>SYSTEM's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-015 | Verify Stripe create-intent with Agent role | HTTP 403 with `{"message":"Only customers can use bank cash-in"}`.<br>No PaymentIntent is returned. | Skipped: Stripe cases excluded at the user's request | not executed |
| TC-016 | Verify Stripe create-intent with amount below minimum | HTTP 400 with `{"message":"Minimum cash-in amount is 10 tk"}`.<br>No PaymentIntent is returned. | Skipped: Stripe cases excluded at the user's request | not executed |
| TC-017 | Verify Stripe cash-in confirmation with valid payment | Response `message` "Cash in successful" with `trnxId` equal to the PaymentIntent id and `amount` 500.<br>Customer 1's balance increased by exactly 500; SYSTEM's balance decreased by exactly 500.<br>Two ledger rows share `trnxId` = PaymentIntent id: SYSTEM `debit=500, credit=0` and Customer 1 `debit=0, credit=500`, both with description "Bank Cash In (Stripe)". | Skipped: Stripe cases excluded at the user's request | not executed |
| TC-018 | Verify Stripe confirm with another Customer's PaymentIntent | HTTP 403 with `{"message":"Payment intent does not belong to this account"}`.<br>Customer 2's balance is unchanged. | Skipped: Stripe cases excluded at the user's request | not executed |
| TC-019 | Verify Stripe confirm replay with a processed PaymentIntent | HTTP 208 with `{"message":"This payment has already been processed"}`.<br>Customer 1's balance is unchanged by the replay. | Skipped: Stripe cases excluded at the user's request | not executed |
| TC-020 | Verify deposit initiated by suspended Agent | HTTP 403 with `{"message":"From account is not active. Please contact admin."}`.<br>Customer 1's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-021 | Verify deposit to suspended Customer | HTTP 403 with `{"message":"To account is not active. Please contact admin."}`.<br>QA-CUST-3's balance is unchanged and the Agent's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-022 | Verify concurrent deposits exceeding Agent balance | Exactly one request succeeds; the other returns the insufficient-balance response (HTTP 208, as in TC-007).<br>QA-AGENT-2's balance is never negative: only one deposit is applied, so the balance falls by the net debit of 585 (`600 - 15` commission) and ends at 415. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
| TC-023 | Verify deposit from SYSTEM account initiated by Customer | HTTP 403 with `{"message":"Unauthorized: you can only initiate transactions from your own account"}`.<br>Customer 1's balance is unchanged. | Out of scope: only the first 5 High priority test cases from section 3 were requested | not executed |
