# SM-L01 Review: Non-numeric amount forms such as "0x10", "1e1" and [20] are accepted

| | |
|---|---|
| **Bug** | SM-L01 · [Issue #5](https://github.com/kawsar-95/genAI-project/issues/5) · Low |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ✅ **Behaviour fixed.** ⚠️ The error message differs from the spec. **Blocks merge.** |

## Requirement
Each of `"0x10"`, `"1e1"` and `[20]` is rejected with HTTP 400 and **exactly** `Amount must be a valid number greater than 0`. Source: BRD §15.

## Fix in this PR
- The amount must be a number or a string, and `String(amount).trim()` must match `/^\d+(\.\d{1,2})?$/`: `sendMoney.controller.js:42-45`.

## Assessment
- **Fixed?**
  - The behaviour is fixed: all three inputs return 400 and the ledger doesn't change.
  - The response message differs from the one the spec requires.

### Strengths
- Also rejects `true`, objects, `"Infinity"`, `"NaN"`, `" 1e1 "` and full-width digits.
- Checks the type before `Number()`, so arrays can no longer be turned into numbers.

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| **Minor (spec deviation, blocks merge)** | `sendMoney.controller.js:44` | Invalid amounts now return `"Amount must be a valid number greater than 0 with at most 2 decimal places"`. The spec expects exactly `Amount must be a valid number greater than 0`, and that message is also the contract in payment, deposit and withdraw and in `qa-findings/06-deposit-cash-in-test-design.md:182`. The messages are also inconsistent: `"0"` and `0` get the old message (`:48`), while `"-1"`, `"abc"` and a missing amount get the new one. Exact-match tests and API clients will break. | Split the check. First check the type and `/^\d+(\.\d+)?$/`, returning the original message. Then check the decimal count, returning a separate "Amount can have at most 2 decimal places" message. |
| Minor (backward compatibility, acceptable) | `sendMoney.controller.js:42-45` | `"20."` and `".5"` used to be accepted and now return 400. `.5` is below the 10 Tk minimum anyway, and `"20."` is an unusual input. | Document the stricter format in `endpoints.md` and `swagger/swaggerTrnx.yaml`. |

## Suggested verification
Each of these should return 400 with the **spec message**, and the sender's balance should not change:
```bash
for a in '"0x10"' '"1e1"' '[20]' 'true' '"abc"' '-5' '{}'; do
  curl -s -X POST .../transaction/sendmoney ... \
    -d "{\"from_account\":\"01686606902\",\"to_account\":\"01686606903\",\"amount\":$a}"; echo
done
```
**Regression:** `"20"`, `20`, `20.0` and `" 20 "` should all still return 201.

**Already run (2026-10-06, local server):** `"0x10"`, `"1e1"` and `[20]` each returned 400 (with the new message), and the balance did not change.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.** This message issue is one of the two blockers. The other is the SM-M01 collation bypass.
- **Follow-up:** Payment and Withdraw can still break the shared daily limit (see SM-H02).
- **Process gaps:** no automated tests, and `endpoints.md` and Swagger have not been updated.
