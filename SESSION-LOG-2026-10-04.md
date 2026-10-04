# Session Log — 2026-10-04

What I asked Claude, what Claude did, and what ended up on disk.

Prompts are lightly cleaned up from what I typed. Outputs are condensed, not word for word.

---

## Part 1 — Test executor skill and agent

### execute-test skill and test-executor-agent
**Prompt:** Create a skill named `execute-test` that executes already-prepared test cases, using only agent-browser for UI testing and curl for API testing. Create an agent `test-executor-agent` on the Sonnet model that uses it. Do not try to produce any bug. Finish all test cases unless I explicitly ask for major test cases only. When finished, create `<module jira_id>.test-result.md` inside `.artifacts` as a table: Test Case Id | Test Title | Expected Result | Actual Result | Test Result (pass/failed/not executed), with the id, title and expected result coming from `test.md`.

**Output:** Created `.claude/skills/execute-test/SKILL.md` and `.claude/agents/test-executor-agent.md` (model `sonnet`, tools Read, Write, Glob, Grep, Bash, Skill). The skill covers hard rules (only agent-browser and curl, no bugs, local/dev only), scope, the three result values, blocked cases, the report template and a self-check. Added an `execute-test` row to the skills table in `README.md`.

### Add the tools to the agent
**Prompt:** You missed agent-browser for UI testing and curl for API testing in `test-executor-agent.md`. Add them.

**Output:** Added a "Testing tools" section to the agent: how to run agent-browser (check it exists, open → snapshot → fill/click → re-snapshot) and curl (command form, status code and response fields), plus the rule that nothing else touches the system under test.

---

## Part 2 — Deposit test cases and the first execution

### Rewrite the deposit test cases
**Prompt:** Rewrite `qa-findings/03-deposit-test-cases.md` and add prioritized test cases as a section.

**Output:** Rewrote it in the `test-design` format: setup block (URLs, auth headers, seeded accounts, OTP dev bypass, six fixture accounts), 1. Requirement Highlights (R-1 to R-10), 2. Test Cases (TC-001 to TC-023 with numbered steps and exact bodies), 3. Prioritized Test Titles (15 High, 8 Mid) and Open Questions. Titles now start with "Verify" and no longer reveal the outcome. DB edits in the old steps were replaced with API steps.

### Execute the first 5 High cases
**Prompt:** Execute only the first 5 HIGH priority test cases from section 3.

**Output:** The backend and frontend were down (connection refused on ports 5000, 3000, 3006), so all 23 rows in `.artifacts/03-deposit-test-cases.test-result.md` came out `not executed`.

### Skip Stripe and start the servers
**Prompt:** Skip stripe cases and start them.

**Output:** Started the API (`npm start`, port 5000) and the web app (`npm run dev`, port 3000). Ran TC-001, TC-002, TC-011 and TC-013 with curl; all four passed. TC-017 and the other Stripe cases were skipped. Result: 4 pass, 0 failed, 19 not executed.

---

## Part 3 — Report format changes

### Natural-language results
**Prompt:** Expected Result and Actual Result should be clean natural language. Instead of "HTTP 201 with message "Deposit successful", a trnxId, and commission 12.5…", write "Deposit successful. Customer 1’s balance increased by 500 BDT, with a transaction ID and 12.5 BDT commission." Same for Actual Result. Update the test-result table.

**Output:** Rewrote both columns in the report in plain language with real before/after values. No status codes, JSON, endpoints or field names. Not-run rows start with "Not run:" and give the reason.

### Sync the skill and agent
**Prompt:** Update the agent and the skill based on the format you just applied.

**Output:** Added a "Result wording" section to the skill (write like this, never include, examples for pass, failed and not executed), updated the template, self-check and reply rules, and added the rule to the agent. Test ID and title stay verbatim; the Expected Result is now rewritten in natural language.

### Test Data column
**Prompt:** Add a new field "test data" after Test Title with the values already executed (for example balance=500, phone_number=…). For API testing, only the endpoint and the payload.

**Output:** Added a Test Data column (six columns now). The four executed rows show the login, endpoint, payload and starting balance; the 19 not-run rows show `-`. Updated the skill and agent to match, including "no passwords, tokens or OTPs".

### Align the report with the skill
**Prompt:** (after an unclear "again update the report") Based on the skill and the agent, update the test-result file.

**Output:** Checked the report against the current rules. Only the Scope line was wrong (it listed TC-017 as executed). Fixed it.

### Beautify the payloads
**Prompt:** Beautify the test data JSON formatting. (Then again: beautify the test data payload formatting.)

**Output:** First pass: pretty-printed JSON with `&nbsp;` indents. Second pass: bold labels (Login / Request / Balance before), the endpoint in code style, and the payload in a `<pre>` block. The skill and agent examples were changed to the same layout.

---

## Part 4 — qa-reviewer-agent

### Create the reviewer
**Prompt:** Create a `qa-reviewer-agent` inside the agents folder as an adversarial sub-agent on the Opus 5.5 model. It reviews the bugs Claude reports before `bug.md` is created. It must understand the requirement and use graphify and Serena for business knowledge. If any bug is flagged, it must tell Claude to update before the final report. It should have no write permission, so it only reads and verifies.

**Output:** Created `.claude/agents/qa-reviewer-agent.md` (model `claude-opus-5-5`). Tools: Read, Grep, Glob, Skill and the read-only Serena tools only (no Write, Edit or Bash). It checks every bug against ten questions and returns APPROVED / FLAGGED / REJECTED per bug plus a gate, PASS or BLOCKED. On BLOCKED it gives numbered changes and requires a re-review.

### graphify as the knowledge base
**Prompt:** You missed using graphify as the knowledge base. Mention it in `qa-reviewer-agent.md`.

**Output:** Added a "Knowledge base: graphify" section (read `GRAPH_REPORT.md` and `graph.json` first, treat the graph as knowledge, trust the code when they disagree, read-only). Verdicts must now cite the graphify node and the Serena trace.

---

## Part 5 — Send money bug hunt

### Find bugs with the four skills
**Prompt:** Find out bugs from the send money feature with /qa-agent /qa-agent-advocate /find-bug /validate-bug.

**Output:** Read the send-money controller, limit checker, models and page against BRD §7.3, §8 and §9, and ran blast-radius (no application-code changes vs `main`). Restarted the stopped servers. Reproduced six bugs with agent-browser and curl, then sent the draft to `qa-reviewer-agent`. First pass: BLOCKED (all six flagged, none rejected). After fixes: PASS. Wrote `dmoney-transaction-api/qa-findings/08-send-money-bugs.md`:

| ID | Priority | Bug |
|---|---|---|
| SM-H01 | High | A request without `from_account` or `to_account` crashes the whole API process |
| SM-H02 | High | Concurrent send-money requests exceed the daily transaction-count limit |
| SM-M01 | Medium | Sending to own account with a trailing space in the receiver number is accepted |
| SM-M02 | Medium | Amounts with more than two decimal places are accepted and stored unrounded |
| SM-L01 | Low | Non-numeric amount forms such as "0x10", "1e1" and [20] are accepted |
| SM-L02 | Low | Receipt "Total Amount" excludes the service fee that was debited |

### Code trace only, verified by the reviewer
**Prompt:** You don't have to reproduce. Just find bugs from the send money feature and verify them by the reviewer agent.

**Output:** Found five more candidates by code trace. The reviewer rejected four and approved one after two rounds of fixes. Added the approved one to the report as SM-L03: a non-string receiver value makes the request fail with HTTP 500 and the raw internal validation message (code trace, not executed, Low confidence). The four rejections and an open requirement question about the 10,000 BDT wallet cap are recorded in the report's limitations.

### What the reviewer flagged or dropped
**Prompt:** Tell me if any bug is flagged or dropped by the reviewer agent. Just the titles.

**Output:**
- **Flagged, then approved:** all six bugs in the table above, and SM-L03 (flagged twice).
- **Dropped:**
  - The receiver's 10,000 BDT wallet cap is not checked when money is sent
  - Any logged-in Customer can tell which phone numbers are registered from the send-money error responses
  - The "current balance" in the success response can be wrong when sends overlap
  - Phone format and minimum amount are not checked on the Send Money page before sending

---

## What ended up on disk

| Path | What |
|---|---|
| `.claude/skills/execute-test/SKILL.md` | Skill that executes prepared test cases and writes the six-column report |
| `.claude/agents/test-executor-agent.md` | Sonnet agent that uses the skill |
| `.claude/agents/qa-reviewer-agent.md` | Read-only Opus adversarial reviewer (graphify + Serena) |
| `dmoney-transaction-api/qa-findings/03-deposit-test-cases.md` | Rewritten deposit test cases with prioritized titles |
| `dmoney-transaction-api/.artifacts/03-deposit-test-cases.test-result.md` | Result of running 4 of 23 deposit cases (4 pass, 19 not executed) |
| `dmoney-transaction-api/qa-findings/08-send-money-bugs.md` | Send money bug report, 7 bugs (2 High, 2 Medium, 3 Low) |
| `README.md` | One new row in the skills table |

## Side effects outside the files

- The API (port 5000) and the web app (port 3000) were started and left running.
- The local database has extra deposit and send-money ledger rows from the test runs, and Customer 1 has used its daily send-money allowance for 2026-10-04 (UTC).
- The API process was crashed and restarted twice on purpose to reproduce SM-H01.
- Nothing was committed.
