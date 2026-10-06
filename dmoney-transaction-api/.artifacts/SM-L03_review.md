# SM-L03 Review: A non-string receiver value fails with HTTP 500 and the raw internal validation message

| | |
|---|---|
| **Bug** | SM-L03 · [Issue #7](https://github.com/kawsar-95/genAI-project/issues/7) · Low |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ✅ **Fixed** |

## Requirement
`to_account: ["01686606903"]`, or any other non-string receiver, returns HTTP 400 with no internal detail and no change to the ledger. Source: BRD §15.

## Fix in this PR
- `typeof … !== 'string'` guards on both accounts: `sendMoney.controller.js:31-36`.
- The 500 response no longer includes `error: err.message` (`sendMoney.controller.js:191`). The new outer catch also returns only a generic message (`:21`).

## Assessment
- **Fixed?** Yes.
  - Arrays and objects are rejected before `Users.findOne`, so the `IN (...)` lookup that matched the receiver can no longer happen.
  - No 500 path in this handler returns internal text any more.

### Strengths
- Fixes the cause (non-strings are rejected before the lookup) and also stops the leak.
- A deadlock or any other unexpected error now also returns a clean 500 (`{"message":"Internal server error"}`).

### Issues
None specific to this bug.

## Suggested verification
```bash
-d '{"from_account":"01686606902","to_account":["01686606903"],"amount":20}'   # 400 to_account is required and must be a string
-d '{"from_account":["01686606902"],"to_account":"01686606903","amount":20}'   # 400
-d '{"from_account":"01686606902","to_account":{"a":1},"amount":20}'            # 400
# form-encoded variant
curl ... -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'from_account=01686606902&to_account[]=01686606903&amount=20'          # 400
```
Confirm that no rows were written: `SELECT COUNT(*) FROM Transactions WHERE createdAt > NOW() - INTERVAL 1 MINUTE` should return 0.

**Already run (2026-10-06, local server):** the array receiver returned 400 "to_account is required and must be a string", and the balance did not change. The original issue was only traced in code and never run against the server; this was the first time the request was sent.

## Out of scope (tracked separately)
- The global error handler (`app.js:36-39`) still returns `err.message` in its response. This handler no longer reaches it. It belongs to the security findings in `qa-findings/04-security-vulnerabilities.md`.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.**
- **Must fix before merge:**
  - SM-M01: the collation bypass of the own-account check.
  - SM-L01: the error message differs from the spec.
- **Follow-up:** Payment and Withdraw can still break the shared daily limit (see SM-H02).
- **Process gaps:** no automated tests, and `endpoints.md` and Swagger have not been updated for the new 400 messages.
