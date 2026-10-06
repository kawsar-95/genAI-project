# SM-M02 Review: Amounts with more than two decimal places are accepted and stored unrounded

| | |
|---|---|
| **Bug** | SM-M02 · [Issue #4](https://github.com/kawsar-95/genAI-project/issues/4) · Medium |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ✅ **Fixed** |

## Requirement
An amount with 3 or more decimal places is rejected, both by the server and by the form, which promises `step 0.01`. The receipt matches what was debited and credited. The BRD has no explicit decimal rule; the requirement comes from BDT having two decimal places and from the form's own `step`.

## Fix in this PR
- **Server:** the amount must match `/^\d+(\.\d{1,2})?$/`. See `sendMoney.controller.js:12` (the pattern) and `:42-45` (the check).
- **Client:** the same pattern is checked in `validate()`: `page.tsx:67-71`. This was needed because the form's `noValidate` turns off the browser's `step` check.

## Assessment
- **Fixed?** Yes.
  - `10.555` and `"10.555"` are both rejected.
  - Every 2-decimal string the UI accepts survives `Number()` and then `String()` unchanged (shortest round-trip), so the server's `String(amount)` check agrees with the client.

### Strengths
- The check runs on `String(amount)` for both numbers and strings, so the server is protected even when the frontend is bypassed.
- The regex is linear, so there is no ReDoS risk, and `\d` matches ASCII digits only.
- The reviewer's edge-case results:
  - Rejected: `1e21`, `0.1+0.2` (= 0.30000000000000004), `"20."` and `".5"`.
  - Accepted: `20.0` and `" 20 "`.

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| Minor | `sendMoney.controller.js:56, 138` | `debit = amt + p2pFee` is never rounded. That's fine with today's flat 5 Tk fee. If an admin switches the SendMoney rule to `percentage` (supported by `Commission.calcFee`, `Commission.js:113-120`), the debit could again have more than 2 decimals. | Round the fee to paisa (`Math.round(fee * 100) / 100`), or keep amounts in integer paisa. |
| Minor | `page.tsx:67-71` | Input like `1e1` passes `Number(...) > 0` and then gets "Amount can have at most 2 decimal places", which is the wrong reason. | Check the pattern first with a general "Enter a valid amount" message, or reword it as "Enter a valid amount with at most 2 decimals". |

## Suggested verification
- **API:**
  - `-d '{"from_account":"01686606903","to_account":"01686606902","amount":10.555}'` → 400.
  - `"amount":"10.555"` → 400.
  - `"amount":10.55` → 201, and the statement shows debit **15.55** and credit **10.55**.
- **UI:** type `10.555`. The field error appears and no network request is sent (check in DevTools).

**Already run (2026-10-06, local server):** `10.555` returned 400 and the balance did not change. The UI check was only type-checked (`tsc --noEmit`), not tried in a browser.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.**
- **Must fix before merge:**
  - SM-M01: the collation bypass of the own-account check.
  - SM-L01: the error message differs from the spec.
- **Follow-up:** Payment and Withdraw can still break the shared daily limit (see SM-H02).
- **Process gaps:** no automated tests, and `endpoints.md` and Swagger have not been updated for the 2-decimal rule.
