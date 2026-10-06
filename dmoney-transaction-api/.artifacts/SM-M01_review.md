# SM-M01 Review: Sending to own account with a trailing space in the receiver number is accepted

| | |
|---|---|
| **Bug** | SM-M01 · [Issue #3](https://github.com/kawsar-95/genAI-project/issues/3) · Medium |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ⚠️ **Partially fixed. Blocks merge.** |

## Requirement
Any `to_account` that resolves to the sender's own account is rejected with 400 "From account and to account cannot be the same", from both the UI and the API. Source: BRD §7.3 precondition 2, §14.

## Fix in this PR
- The server trims both accounts before the user lookup and the same-account check: `sendMoney.controller.js:39-40, 75`.
- The UI sends `formData.receiver.trim()`: `page.tsx:89`.

## Assessment
- **Fixed?** Partially.
  - The reported input (a trailing space) is now rejected.
  - The root cause is not fixed. The check compares the request strings with `===` (`sendMoney.controller.js:75`), but the user lookup runs under the `utf8mb4_unicode_ci` collation, which treats more than just spaces as equal.

### Strengths
- Trimming on both the server and the UI is correct. It also stops the ledger from storing a non-canonical account key such as `'01686606903 '`.
- Leading spaces, which used to produce a 404, are now accepted cleanly.

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| **Important** | `sendMoney.controller.js:75` (with `:59-60`) | Strings the collation treats as equal still get past the check. A zero-width space (U+200B) after the number survives `String.prototype.trim()`, so `===` returns false. MySQL still finds the same user, because U+200B is ignorable in `utf8mb4_unicode_ci`. A full-width digit (`０1686606903`) behaves the same way. The original bug comes back: the sender loses the 5 Tk fee, and a credit row is written under a non-canonical account string. The UI is affected too, because phone numbers copied from chat apps often carry invisible characters. | Compare the DB identities: `if (from_account_exists.getDataValue('id') === to_account_exists.getDataValue('id')) return 400`. Use the canonical `getDataValue('phone_number')` values for the `FOR UPDATE` and all three ledger rows. Optionally also check the phone format (`/^01\d{9}$/`) on both fields to reject these strings early. |
| Minor | `sendMoney.controller.js:67-69` | The same gap lets a non-canonical `from_account` (for example, one with a zero-width space) pass the ownership check, which compares the DB row's canonical values with the JWT identifier. That string is then written as the debit row's `account`. Balances still add up through the collation, but statements and any string-equality report will be wrong. | Using canonical DB values, as in the fix above, covers this too. |

### Independent verification of the Important issue
The coordinator re-checked the reviewer's claim on 2026-10-07 (read-only):
- **Node:** `"01686606903​".trim() === "01686606903"` → `false`, so the zero-width space is kept.
- **MySQL:** `SELECT COUNT(*) FROM Users WHERE phone_number = '01686606903<U+200B>'` → **1**. The control value `'01686606903x'` → 0.

The reviewer also reported that a full-width zero (`'０1686606903'`) matches user id 5.

## Suggested verification
Each request should return 400 "From account and to account cannot be the same", and the sender's balance should not change:
```bash
-d '{"from_account":"01686606902","to_account":"01686606902 ","amount":20}'    # trailing space (fixed)
-d '{"from_account":"01686606902","to_account":" 01686606902","amount":20}'    # leading space (fixed)
-d $'{"from_account":"01686606902","to_account":"01686606902​","amount":20}'  # zero-width space (NOT fixed)
-d '{"from_account":"01686606902","to_account":"０1686606902","amount":20}'    # full-width digit (NOT fixed)
```
**UI:** log in as 01686606903 and paste `01686606903` followed by a zero-width space as the receiver. The send must be rejected.

**Already run (2026-10-06, local server):** the trailing-space case returned 400 "From account and to account cannot be the same", and the balance did not change.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.** This issue is one of the two blockers. The other is the SM-L01 error message.
- **Follow-up:** Payment and Withdraw can still break the shared daily limit (see SM-H02).
- **Process gaps:** no automated tests, and `endpoints.md` and Swagger have not been updated.
