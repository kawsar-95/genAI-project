---
name: test-charter
description: Write session-based exploratory test charters (mission, scope, risks, heuristics, oracles, time-box) and session reports/debriefs. Use when the user asks for a "test charter", "exploratory testing charter", "charter for <feature>", "SBTM session", "what should I explore", or wants to plan or report an exploratory testing session for a ticket, PR, feature, or API.
---

# Test Charter

Produce focused, time-boxed exploratory test charters a tester can pick up and run without asking questions, plus a session-report template to capture results.
**Rule: a charter is a mission, not a script.** It says *where to look and why*, never step-by-step clicks.

## When to use

- "Write a test charter for the login/transfer/withdraw feature", "Charter for PR #42", "Plan an exploratory session".
- After a change lands and scripted tests exist but risk remains (new flows, integrations, money, auth).
- To report or debrief a finished session.

**Don't use for:** ticket explanation (`understand-task`), change impact (`blast-radius`), scripted test cases (`test-design`), bug root cause (`analyze-rootcause`).

## 1. Gather context (never skip)

| Input | How to get it |
|---|---|
| Jira / GitHub ticket | Fetch it (`gh issue view <n> --comments`, Atlassian MCP) — read all comments |
| PR / branch | `gh pr view <n>` + `git diff main...HEAD --stat`; run `blast-radius` for impact |
| Codebase area | Query `graphify-out/` first if present, then read routes, controllers, validators, UI pages |
| Pasted text | Use as-is |

- Identify: actors/roles, entry points (UI pages, API endpoints), data states, integrations, money/auth paths.
- If a source can't be fetched, say so in one line and ask for the text. Do not invent requirements.

## 2. Procedure

1. **Model the target** with SFDPOT: Structure, Function, Data, Platform, Operations, Time.
2. **List risks** — what could go wrong and who gets hurt. Rank High / Med / Low by impact × likelihood.
3. **Split into charters** — one charter per risk cluster. Each must fit a 60–90 min session. Too big → split; too small → merge.
4. **Write each mission** in the form: **Explore** `<target>` **with** `<resources/techniques>` **to discover** `<information/risk>`.
5. **Pick oracles** — how the tester will recognise a problem (see section 4).
6. **Define setup & data** — accounts, roles, seed data, env, tools needed before the timer starts.
7. **State out of scope** explicitly so the session stays focused.
8. Order charters by risk (High first). Run the self-check (section 7).

## 3. Heuristics to draw from

Pick only what fits the mission — don't dump the whole list.

| Area | Ideas |
|---|---|
| Input / Data | Boundaries (0, 1, max, max+1), empty, null, whitespace, unicode, emoji, very long, negative, decimals, leading zeros, SQL/script payloads |
| State / Flow | Interrupt mid-flow, back button, refresh, double submit, two tabs, stale session, re-use of one-time tokens |
| Auth / Roles | Wrong role, expired token, missing token, another user's ID (IDOR), privilege escalation via direct URL/API |
| Money / Counts | Rounding, limits (daily/per-txn), insufficient balance, self-transfer, concurrent debits, fee calculation, ledger consistency |
| Time | Timezones, midnight/month-end, DST, clock skew, slow network, timeouts, retries |
| Integration | Downstream failure, partial success, duplicate callbacks, API contract drift between frontend and backend |
| Platform | Browsers, mobile viewport, keyboard-only, screen reader, slow 3G |
| Errors | Message clarity, no stack traces/secrets leaked, correct HTTP status codes, recoverability |

## 4. Oracles (how to spot a bug)

Use FEW HICCUPPS — consistency with: **F**amiliar problems, **E**xplainability, **W**orld, **H**istory, **I**mage, **C**laims (spec/ticket), **C**omparable products, **U**ser expectations, **P**roduct (itself), **P**urpose, **S**tatutes/standards.
Name the concrete oracle per charter, e.g. "DB balance == UI balance", "API returns 403 not 200", "matches AC-3 in ticket".

## 5. Output format — Charter

Repeat this block per charter. Keep each under ~25 lines.

```markdown
### CH-<n>: <short title>   · Priority: High | Med | Low · Time-box: 60 | 90 min

**Mission:** Explore <target> with <resources> to discover <information>.

**Why (risk):** <one line — what fails and who is hurt>

**Areas / Entry points:**
- <page / endpoint / component>

**Ideas to try:**
- <heuristic applied to this target — specific, not generic>

**Oracles:** <how a problem will be recognised>

**Setup & Data:** <accounts, roles, seed data, env, tools>

**Out of scope:** <what NOT to test in this session>

**Traceability:** <ticket / AC / PR / risk ID>
```

Start the reply with a 2–3 line summary: target, number of charters, highest risk. Then a **Charter Index** table:

| ID | Title | Priority | Time-box | Risk covered |
|---|---|---|---|---|

## 6. Output format — Session Report (when asked to report/debrief)

```markdown
## Session Report — CH-<n>

| Field | Value |
|---|---|
| Tester | <name> |
| Date / Start | <yyyy-mm-dd hh:mm> |
| Duration | <actual> vs <time-box> |
| Build / Env | <version, URL, branch> |
| Charter vs Opportunity | <e.g. 80 / 20 %> |
| Time split (T/B/S) | Test <x>% · Bug investigation <y>% · Setup <z>% |

**Areas covered:** <list>
**Test notes:** <what was tried, observations, oddities — terse bullets>

**Bugs:**
| ID | Title | Severity | Steps (short) | Evidence |
|---|---|---|---|---|

**Issues / Blockers:** <env, data, access, questions — things that slowed testing>
**New charter ideas:** <follow-ups discovered during the session>
```

**Debrief (PROOF):** **P**ast — what happened; **R**esults — what was found; **O**bstacles — what got in the way; **O**utlook — what still needs testing; **F**eelings — confidence level in the area (High/Med/Low) and why.

## 7. Self-check before replying

- [ ] Every mission follows *Explore / with / to discover*.
- [ ] Each charter maps to a named risk and a source (ticket, AC, PR, code).
- [ ] Each charter fits its time-box; none is a step-by-step script.
- [ ] Oracles are concrete and checkable, not "works correctly".
- [ ] Out of scope is stated.
- [ ] High-risk areas (auth, money, data integrity) are covered or explicitly excluded with a reason.
- [ ] No invented requirements — unknowns go to **Open Questions**.

## 8. Open Questions

End with a short list of anything the sources didn't answer (limits, roles, expected errors). Omit the section if there are none.

## Rules

- Be terse. Every line carries information — no filler, no restating the ticket.
- Prefer 3–7 sharp charters over 15 vague ones.
- Specific beats generic: "transfer 0.005 BDT to self" beats "test boundary values".
- Never claim a session was run or a bug exists unless the user provided the results.
