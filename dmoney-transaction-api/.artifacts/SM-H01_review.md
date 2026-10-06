# SM-H01 Review: A request without from_account or to_account crashes the API

| | |
|---|---|
| **Bug** | SM-H01 · [Issue #1](https://github.com/kawsar-95/genAI-project/issues/1) · High |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ✅ **Fixed** |

## Requirement
A request with no `from_account` or no `to_account` gets HTTP 400, and the server keeps running (`GET /` still returns `{"message":"Server is up"}`). Source: BRD §7.3, precondition 1.

## Fix in this PR
- Both accounts get a presence and type check before any DB call: `sendMoney.controller.js:31-36`. Each must be a non-empty string.
- The whole handler is wrapped in try/catch, which returns a generic 500: `sendMoney.controller.js:14-23`.
- `const { amount } = req.body` now runs inside the try: `sendMoney.controller.js:26`.

## Assessment
- **Fixed?** Yes.
  - An `undefined` account can no longer reach `Users.findOne`.
  - Any other rejection is caught, so the promise Express 4 receives can't become an unhandled rejection that stops the process.
  - URL-encoded bodies (`extended: true`) that produce arrays or objects are also rejected by the `typeof` check.

### Strengths
- The guard checks the type, not just that a value is present, so it also closes SM-L03 (array receiver).
- Empty and whitespace-only values are rejected.

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| Minor | `sendMoney.controller.js:14` | The `next` parameter is kept but never used. This is harmless. | No change needed. If you want one pattern across controllers, `catch(next)` plus a sanitized global handler is an alternative. |

## Suggested verification
```bash
curl -s localhost:5000/                                   # Server is up
curl -s -w ' %{http_code}\n' -X POST localhost:5000/transaction/sendmoney \
  -H "Authorization: Bearer $T2" -H "X-AUTH-SECRET-KEY: ROADTOSDET" -H 'Content-Type: application/json' \
  -d '{"to_account":"01686606902","amount":20}'            # 400 from_account is required...
curl ... -d '{"from_account":"01686606903","amount":20}'  # 400 to_account is required...
curl ... -d '{"from_account":"   ","to_account":"01686606902","amount":20}'  # 400
curl ... -d '{"from_account":null,"to_account":"01686606902","amount":20}'   # 400
curl -s localhost:5000/                                   # still Server is up
```
**Already run (2026-10-06, local server):** a missing `from_account` and a missing `to_account` both returned 400, and `GET /` still returned "Server is up" afterwards.

## Out of scope (tracked separately)
- The same unchecked `Users.findOne` crash exists in `payment`, `deposit`, `withdraw` and `adminDeposit` (CASHIN-H01).
- The API has no process-level `unhandledRejection` handler.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.**
- **Must fix before merge:**
  - SM-M01: a zero-width space or full-width digit can still get past the own-account check.
  - SM-L01: the error message differs from the one the spec requires.
- **Follow-up:** Payment and Withdraw can still break the shared daily limit (see SM-H02).
- **Process gaps:** no automated tests, and `endpoints.md` and Swagger have not been updated for the new 400 messages.
