# SM-L02 Review: Receipt "Total Amount" excludes the service fee that was debited

| | |
|---|---|
| **Bug** | SM-L02 · [Issue #6](https://github.com/kawsar-95/genAI-project/issues/6) · Low |
| **PR** | [#8 `fix/send-money-bugs` → `main`](https://github.com/kawsar-95/genAI-project/pull/8) |
| **Range reviewed** | `1a99e4c..3a6456e` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | 2026-10-07 |
| **Verdict for this bug** | ✅ **Fixed** (not checked in a browser) |

## Requirement
The receipt's "Total Amount" equals what was debited from the sender: amount + service fee (for example, 20 + 5 = 25). Source: BRD §7.3.

## Fix in this PR
- `page.tsx:183-201`:
  - The old tile is renamed **Amount Sent**.
  - **Service Fee** is unchanged.
  - A new **Total Amount** tile shows `sentAmount + (serviceFee ?? 0)`.

## Assessment
- **Fixed?** Yes.
  - The API always returns a numeric `fee` (`sendMoney.controller.js:173`), so the total matches the debit row.
  - With 2-decimal amounts and a flat fee, `toFixed(2)` shows no floating-point error.

### Strengths
- Shows the full breakdown instead of only renaming the label.
- Uses the fee returned by the server instead of a hardcoded 5.

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| Minor | `page.tsx:199` | If `fee` is ever missing or not a number, `?? 0` makes "Total Amount" equal the amount and brings the original bug back without any sign. | Render the Total tile only when `serviceFee !== null`. |
| Minor | `page.tsx:183-201` | The total is calculated on the client from the form input. | Have the API return `totalDebit`, which is authoritative and stays correct if the fee rules change. |

## Suggested verification
1. **UI:** log in as Customer 2 and send 20 to `01686606902`. The receipt should show Amount Sent **৳20.00**, Service Fee **৳5.00** and Total Amount **৳25.00**.
2. **API:** `GET /transaction/statement/01686606903?count=2` should show a debit of **25** for that `trnxId`.
3. Repeat with an amount of 10.55. The receipt total should be **৳15.55**.

**Not yet run:** only `tsc --noEmit` has been run on the page. The receipt has not been checked in a browser.

## Out of scope (tracked separately)
- The same "Total Amount excludes fee" label appears on four other receipt pages: agent cash-in, agent payment, customer cash-out and customer payment.

## PR-level context
- **Overall PR verdict:** **Ready to merge with fixes.**
- **Must fix before merge:**
  - SM-M01: the collation bypass of the own-account check.
  - SM-L01: the error message differs from the spec.
- **Follow-up:** Payment and Withdraw can still break the shared daily limit (see SM-H02).
- **Process gaps:** no automated tests.
