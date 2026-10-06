---
name: test-design
description: Design traceable test cases from a ticket, requirement, PR, commit, API endpoint, or UI page. Output has exactly three sections — Requirement Highlights, Test Cases (ID, "Verify…" title, steps, expected result), and Prioritized Test Titles grouped by High / Mid / Low as tables with a one-line expected result and a type tag (Sanity / Feature / Regression / Security / System Architecture / Non-functional). Use when the user asks to "write test cases", "design tests", "what should I test", "test scenarios for <feature>", or "sanity/regression tests for this PR".
---

# Test Design

Turn a requirement or code change into the **smallest set of test cases that proves the behavior works and exposes likely failures**.
**Rule: every case has one purpose, exact steps, and observable expected results.** No duplicates, no filler.

## When to use

- "Write test cases for ABC-123", "Design tests for PR #42", "Test scenarios for the transfer API".
- After `understand-task` has produced acceptance criteria — use them as input.
- Before writing automation — the cases become the automation backlog.

**Don't use for:** ticket explanation (`understand-task`), impact analysis (`blast-radius`), exploratory missions (`test-charter`), debugging failures.

## 1. Gather context (never skip)

| Input | How to get it |
|---|---|
| Jira / GitHub ticket | Fetch it (`gh issue view <n> --comments`, Atlassian MCP) — read all comments |
| PR / commit | `gh pr view <n>`, `git diff main...HEAD`, `git show <sha>`; run `blast-radius` for related callers |
| API endpoint | Route → controller → validator → service → model; check `swagger/`, `endpoints.md` |
| UI page | Page component, form validation, API calls, role guards |
| Codebase | Query `graphify-out/` first if present |
| Pasted text | Use as-is |

- If a source can't be fetched, say so in one line and ask for the text. Never design from a title alone.
- Never invent behavior. If a rule or limit isn't in a source, list it under **Open Questions** (end of reply).

## 2. Procedure

1. Extract the requirements, rules, limits, roles, and states → **Requirement Highlights**.
2. Apply the techniques below — pick what fits; don't force all of them.
3. Add negative, validation, auth, and error-handling cases for every entry point.
4. Add related regression for directly affected callers and shared flows.
5. Remove duplicates — merge cases that hit the same input class and outcome.
6. Assign priority (High / Mid / Low) to every case.
7. Assign exactly one primary **type tag** to every case (section 4b).
8. Run the self-check (section 6), then produce the output (section 5).

## 3. Techniques & coverage checklist

| Technique | Use when |
|---|---|
| Equivalence Partitioning | Input has valid / invalid classes — one case per class |
| Boundary Value Analysis | Numeric, length, or date limits — min-1, min, max, max+1 |
| Decision Table | Outcome depends on combined conditions |
| State Transition | Entity has a lifecycle (pending → success → reversed) |
| Pairwise | Many independent parameters (role × type × channel) |
| Error Guessing | Null, empty, duplicates, special chars, concurrency |
| End-to-end Flow | Business journey across pages / services |

**Always check:**
- **Validation:** required fields, type, format, length, whitespace, unicode, leading zeros, injection payloads.
- **Auth:** no token, expired/invalid token, wrong role, another user's resource (IDOR).
- **API contract:** status code, response schema, error message, idempotency.
- **Money / data:** min/max/daily limits, insufficient balance, self-transfer, fee, rounding, balance before/after, no partial update on failure.
- **Concurrency:** double submit, parallel requests on the same record.
- **UI:** field errors, disabled/loading states, refresh/back mid-flow.

## 4. Priority rules

| Priority | Assign when |
|---|---|
| **High** | Core happy path, money, auth, data integrity, release blocker |
| **Mid** | Main negative paths, boundaries, validation, related regression |
| **Low** | Cosmetic, rare combinations, nice-to-have |

## 4b. Type tags

Give each case **one** primary type, chosen by the main thing it proves. Priority and type are independent: a Security case can be Mid, and a Feature case can be High.

| Tag | Assign when the case mainly proves… | Example |
|---|---|---|
| **Sanity** | The core happy path works at all. If it fails, stop testing. Usually 1–2 cases per feature. | Agent deposit to Customer with a valid amount |
| **Feature** | A business rule of the feature under test: calculation, limit, boundary, cap, status, allowed combinations, validation. | Deposit below the minimum; commission amount |
| **Regression** | A related or sibling flow still works: shared callers, shared ledger or data, or flows the change routes around. | Stripe cash-in and Admin deposit after a deposit change |
| **Security** | Authentication or authorization: wrong role, ownership or IDOR, missing or expired token, replay, data exposure, injection. | Deposit using another Agent's phone |
| **System Architecture** | Integrity that depends on the system's design: concurrency or locking, transactions or rollback, idempotency of the data pipeline, cross-service consistency. | Two parallel deposits that exceed the Agent's balance |
| **Non-functional** | Performance, load, reliability, recovery, accessibility, compatibility, **with a target from a source**. | 50 parallel transfers each complete within the SLA |

Rules:
- If a case could fit two tags, pick the one whose failure is the most serious. An ownership check is **Security** even though it's also a business rule.
- Correctness under concurrency is **System Architecture**. Speed or capacity under load is **Non-functional**. Never tag a case Non-functional without a confirmed target.
- If no case fits a tag, say so in the type summary rather than forcing one.

## 5. Output format — exactly three sections, in this order

### 1. Requirement Highlights

Short bullets — one checkable fact each, with its source. No restating the whole ticket.

```markdown
## 1. Requirement Highlights
- **R-1:** <rule / behavior> — _<ticket / AC / comment / file:line>_
- **R-2:** <limit, e.g. "Transfer amount must be 10–25,000 BDT"> — _<source>_
- **Roles:** <who can do what>
- **Out of scope:** <what is not being tested>
```

### 2. Test Cases

Number cases `TC-001` upward in one continuous sequence.

```markdown
## 2. Test Cases

### TC-001: Verify <action> with <condition>
**Test Steps:**
1. <precondition / login as role / seed data>
2. <action — UI action, or API call with method, path, and exact body>
3. <action>

**Expected Result:**
- <observable output — status code, message text, UI state>
- <side effect — DB row, balance, email, log>
```

**Title rules (strict):**
- Must start with **"Verify"**.
- Concise (≤ 12 words) and actionable — names the action and the condition.
- **Must not disclose the expected outcome.** Never use words like *fails, succeeds, shows error, is rejected, is displayed, returns 400*.

| ✅ Good | ❌ Bad (discloses output) |
|---|---|
| Verify transfer with amount exceeding balance | Verify transfer fails when amount exceeds balance |
| Verify login with expired token | Verify login returns 401 for expired token |
| Verify withdraw with amount below minimum limit | Verify error message shown for low withdraw amount |
| Verify user list access with agent role | Verify agent cannot access user list |

**Step rules:** numbered, one action per step, exact test data (e.g. `amount = 25001`, never "invalid amount").

**Expected Result rules:** clear and observable; can be multiple bullets. Include exact status code / message text / UI state where known, and side effects (DB, balance, notifications). If unknown from sources, write `TBD — see Q-n`.

### 3. Prioritized Test Titles

One table per priority group. Each row has the case ID, the title, **the one most important expected result on one line**, and the **type tag** (section 4b). There are no steps. Every case appears exactly once.

**Expected result column rules:**
- One line, taken from the case's own **Expected Result** in section 2. Never add an expectation that isn't in the case.
- Give the decisive observable first: the status code and exact message text, or the UI state. Then, after a comma, the one side effect that matters most, such as a balance change, a record created or not, or no change. Example: `400 "Minimum deposit amount is 10 tk…", and no balance changes`.
- If the case's expected result is `TBD — see Q-n`, write the same here.

```markdown
## 3. Prioritized Test Titles

**Type tags:** Sanity · Feature · Regression · Security · System Architecture · Non-functional (definitions in a short legend table when the set uses more than two tags).

### High

| TC | Test title | Expected result | Type |
|---|---|---|---|
| TC-001 | Verify transfer with valid amount and sufficient balance | 201 "Transfer successful", and the sender is debited the amount plus the fee | Sanity |
| TC-004 | Verify transfer with amount exceeding balance | 208 "Insufficient balance", and no balance changes | Feature |
| TC-007 | Verify transfer from another user's account | 403 "Unauthorized…", and no balance changes | Security |

### Mid

| TC | Test title | Expected result | Type |
|---|---|---|---|
| TC-002 | Verify transfer with amount at maximum limit | 201, and exactly the maximum amount is transferred | Feature |

### Low

| TC | Test title | Expected result | Type |
|---|---|---|---|
| TC-009 | Verify transfer form layout on mobile viewport | All fields and the submit button are visible without horizontal scroll at 375 px | Feature |

**Type summary:** Sanity 1 · Feature 3 · Regression 0 · Security 1 · System Architecture 0 · Non-functional 0.
```

- Omit a priority group only if it has no cases. Within each group, order by run order (most critical first).
- End the section with the **Type summary** line. If a tag has 0 cases where you'd expect coverage, for example no Non-functional case for a performance-sensitive change, add a one-line note saying what's missing and why. Usually the reason is that no target is defined.
- The title column still follows the title rules: it never reveals the outcome. The outcome goes only in the Expected result column.

**After the three sections**, add `Open Questions` (`Q-n: <question> — blocks TC-00x`) only if any exist.

## 6. Self-check before replying

- [ ] Output has exactly three sections, in order: Requirement Highlights → Test Cases → Prioritized Test Titles.
- [ ] Every requirement highlight is covered by ≥ 1 test case.
- [ ] Every title starts with "Verify", is concise, and does **not** reveal the expected result.
- [ ] Every case has numbered steps with exact data and ≥ 1 clear expected result.
- [ ] Every entry point has negative, validation, and auth cases.
- [ ] Boundaries use confirmed limits from the source, not guesses.
- [ ] No two cases test the same input class with the same outcome.
- [ ] Every TC appears exactly once in section 3 under High, Mid, or Low.
- [ ] Every section 3 row has a one-line Expected result taken from that case's Expected Result (nothing new added), and exactly one type tag from section 4b.
- [ ] The Type summary counts add up to the number of cases. Any 0-count tag that matters is explained in one line.
- [ ] Unknowns are in Open Questions, not silently assumed.

## Rules

- Be terse. Every line carries information.
- Prefer fewer sharp cases over many vague ones; stop when a new case adds no new input class, rule, role, or outcome.
- When a ticket key is given and the user wants a file, save to `testing_docs/<TICKET-ID>.test.md`; otherwise reply inline.
