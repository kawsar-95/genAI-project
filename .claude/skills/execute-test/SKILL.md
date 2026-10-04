---
name: execute-test
description: Execute already-prepared test cases from a test.md file (for example <JIRA-ID>.test.md) and write a results report to .artifacts/<module jira_id>.test-result.md. UI cases run only with agent-browser, API cases only with curl. Executes every test case unless the user explicitly asks for major/high-priority only. Never raises bugs. Use when the user asks to "execute test cases", "run the tests in <file>", "run test.md", or "execute-test".
---

# Execute Test

Run test cases that **already exist** and report what happened. You are an executor, not a designer or a bug hunter.

## Hard rules

1. **Tools: only `agent-browser` for UI steps and `curl` for API steps** (both through Bash). Nothing else drives the system under test: no Playwright MCP, no test scripts, no SQL/DB tools, no code edits. `Read`/`Write` are allowed only to read the test file and write the report.
2. **Do not produce bugs.** No bug reports, bug IDs, severity, root cause, suspected cause, fix suggestions, or "this is a defect" wording anywhere. A mismatch is recorded as `failed` with the factual actual result in plain words, nothing more.
3. **Finish every test case.** Execute all of them unless the user *explicitly* asks for major/high-priority only (see Scope). Do not stop early, skip cases because they look similar, or ask permission between cases.
4. **Test ID and Test Title come verbatim from the test file.** Never reword, shorten, merge or invent them. The **Expected Result** is taken from the test file but written as clean natural language (see Result wording): same meaning, same numbers and conditions, nothing added or dropped.
5. **Local/dev only.** Confirm every target URL is `localhost`/`127.0.0.1` or a clearly dev environment before the first request. If the test file points at anything else, stop and tell the user. Stripe: test mode only.
6. **Report what you observed.** Never mark `pass` from assumption. Never fabricate an actual result.

## Inputs

| Input | Source |
|---|---|
| Test file | Path given by the user; or `<JIRA-ID>.test.md` / `test.md` found by `Glob` (e.g. `**/*.test.md`, `**/test.md`). If more than one matches and the user did not say which, ask. |
| Module Jira ID | The user's message, else the test file name (`ABC-123.test.md` → `ABC-123`), else the ticket key in the file header. If none exists, ask once. |
| Scope | Default **all** test cases. Only narrow it when the user explicitly says "major", "high priority", "P1", "smoke" or similar. |

## Procedure

### 1. Parse the test file
- Read the whole file. Extract, per case: **ID, Title, Priority, Preconditions, Steps, Expected Result**, plus the shared **test data / setup / credentials / base URLs** section.
- Cases may be tables (one row each) or headed sections. Keep the file's ordering.
- Note the channel of each case: **API** (HTTP calls, status codes, JSON) or **UI** (pages, clicks, visible text). Mixed cases use both.
- If a case has no ID or no expected result, keep it, use what the file gives, and mark the missing field `-`.

### 2. Decide scope
- **All cases** (default).
- **Major only**, when explicitly requested: use the file's priority (High / P1 / Critical; also P2 / Mid only if the user said "major" and the file has no clearer top tier). Cases outside scope are reported as `not executed` with the Actual Result `Not run: outside the requested scope (major test cases only).` They still appear in the report.

### 3. Prepare the environment
- Run `command -v agent-browser` and `curl --version`. If `agent-browser` is missing, UI cases cannot run (see Blocked cases); API cases still run.
- Once per run, `agent-browser skills get core --full` to confirm command names for the installed version.
- Check the API and web app respond (`curl -sS -o /dev/null -w '%{http_code}' <base-url>`). If a target is down, say so in the report notes and mark the affected cases `not executed`.
- Use the credentials, headers and data from the test file's setup section (and `endpoints.md` / README only if the file points there).

### 4. Execute each case, in order
For every in-scope case:

1. Satisfy its preconditions **using only curl or agent-browser** (e.g. log in, create the record through the API/UI the way a user would). Preconditions that need another tool are handled under Blocked cases.
2. Perform the steps exactly as written.
   - **API:** `curl -sS -i -X <METHOD> <url> -H ... -d '<body>'`. Capture status code and body. Use `-w '\n%{http_code}'` where useful. Store tokens in shell variables or a scratchpad file, never in the report.
   - **UI:** `agent-browser open <url>` → `snapshot` → `fill` / `click` / `select` using element refs → `snapshot` or `get text` to read the result. Re-snapshot after every action that changes the page. Close or reuse the session deliberately so state from one case does not leak into the next.
3. Compare what you observed with the case's Expected Result, point by point.
4. Record the **Test Data** you used, the **Actual Result** and the **Test Result** (see Result wording).
5. Continue to the next case regardless of outcome. A `failed` case never stops the run.

Cases that depend on an earlier case's data (e.g. "use the token from TC-01") run after it; if the earlier case could not produce the data, mark the dependent case `not executed` and name the dependency.

### 5. Test Result values (exactly these three)

| Value | Use when |
|---|---|
| `pass` | Every expected result in the case was observed. |
| `failed` | The case was run and at least one expected result was not observed. |
| `not executed` | The case was not run, or could not be completed: out of scope, blocked, dependency failed, environment down, step needs a tool outside agent-browser/curl. The Actual Result says why. |

If the case cannot be fully completed because of a blocked step, it is `not executed`, not `pass`. If it was run and the outcome did not match, it is `failed`.

### 6. Result wording (Test Data, Expected Result, Actual Result)
Expected Result and Actual Result are written for a person reading the report, as clean natural language.

**Write like this**
- Plain sentences. Lead with the outcome, then the effect on balances or data, then any extra detail.
- Use real names and units: `Customer 1’s balance`, `500 BDT`, `6,650.5 BDT`, `12.5 BDT commission`. Use thousands separators for amounts of 1,000 or more.
- Say what the user would see or get ("Deposit successful", "Deposit rejected because the minimum deposit is 10 tk"), not how the system returned it.
- Use `’` (curly apostrophe) for possessives.

**Never put in Expected Result or Actual Result**
- HTTP status codes, HTTP methods, endpoint paths, JSON, field or key names in backticks, headers, curl output, transaction IDs, or table/column names. Describe them instead (`with a transaction ID`, not `with a trnxId`; `deposit rejected`, not `HTTP 400`).
- Bug, defect, issue, root cause, should be fixed, or any suggestion.

**Expected Result**
- Rewrite the test file's expected result: every condition and number stays, wording becomes natural. Keep exact message meaning (limits, amounts, reasons).
- Example. File: `HTTP 201 with message "Deposit successful", a trnxId, and commission 12.5. Customer 1's balance increased by exactly 500 BDT.` → Report: `Deposit successful. Customer 1’s balance increased by 500 BDT, with a transaction ID and 12.5 BDT commission.`

**Actual Result** (what you observed, same style as the Expected Result so the two can be compared directly)
- `pass`: state the observed outcome with the real before/after values. Example: `Deposit successful. Customer 1’s balance increased by 500 BDT to 6,650.5 BDT, with a 12.5 BDT commission.`
- `failed`: state what actually happened and the value that differs. Example: `Deposit successful, but Customer 1’s balance increased by 450 BDT instead of 500 BDT.`
- `not executed`: start with `Not run:` and give the reason. Examples: `Not run: outside the requested scope (only the first 5 High priority test cases from section 3).`, `Not run: Stripe cases were excluded at the user’s request.`, `Not run: the backend was not reachable.`, `Not run: needs the one-time code from the database, and only agent-browser and curl are permitted.`
- Keep each cell to a single table row: no raw newlines (join sentences with a space), escape `|` as `\|`.

Keep the raw evidence (status codes, response bodies) in your working notes only; it does not go in the report.

**Test Data** (the values you actually executed with; the one column where endpoints and payloads belong)
- **API cases:** only the endpoint and the payload that was sent, laid out in this exact shape (a real `<pre>` block keeps the indent and renders as monospace):
  `**Login:** Agent 01686606901<br>**Request:** <code>POST /transaction/deposit</code><pre>{<br>  "from_account": "01686606901",<br>  "to_account": "01686606902",<br>  "amount": 500<br>}</pre>**Balance before:** Customer 1: 6,150.5`
  The payload is valid, pretty-printed JSON: one key per line, two-space indent, quoted keys, string values quoted, numbers unquoted. Login and Balance before are optional lines (include the balance when it matters to the check).
- **UI cases:** the page and the values entered, as `name=value` pairs. Example: `Page: /customer/cash-in-bank<br>amount=500, card=4242 4242 4242 4242`.
- Use the real values from the run (balances, phone numbers, amounts), not the placeholders from the test file.
- Never include passwords, JWTs, OTP codes, API keys or secret headers.
- Cases not run: `-`.

### 7. Blocked cases
A step is blocked when it needs something other than curl/agent-browser (direct DB read/write, server console, mailbox, file system, clock changes). First look for a way to do it through the UI or API as a normal user (e.g. a GET endpoint that returns the value). If there is none, mark the case `not executed` with the reason. Do not use SQL tools, MCP browsers or scripts as a workaround, and do not skip the case silently.

### 8. Write the report
Path: `.artifacts/<module jira_id>.test-result.md`.
- `.artifacts/` is the one inside the project that owns the test file (e.g. `dmoney-transaction-api/.artifacts/`); if the file is not inside a project, use `.artifacts/` at the workspace root. Create the folder if missing. If the report already exists, overwrite it (it is a fresh run).

Template:

````markdown
# Test Result — <module jira_id>

- **Test file:** <path>
- **Executed on:** <YYYY-MM-DD>
- **Environment:** <base URLs>
- **Scope:** All test cases | Major test cases only (as requested)

## Summary

| Total | Pass | Failed | Not executed |
|---|---|---|---|
| N | n | n | n |

## Results

| Test Case Id | Test Title | Test Data | Expected Result | Actual Result | Test Result |
|---|---|---|---|---|---|
| TC-01 | <verbatim title> | <endpoint + payload, or UI values; `-` if not run> | <natural-language expected result> | <natural-language actual result> | pass |
````

Rules:
- One row for **every** test case in the file, in file order, including out-of-scope and blocked ones. Row count must equal the Total.
- Column headers exactly: `Test Case Id | Test Title | Test Data | Expected Result | Actual Result | Test Result`.
- Test Case Id and Test Title: copied verbatim from the test file.
- Test Data: the executed values as described in Result wording; `-` for cases not run.
- Expected Result and Actual Result: natural language as described in Result wording. No status codes, JSON, endpoints or field names.
- No other sections: no bug list, no recommendations, no next steps, no root-cause notes.

### 9. Self-check before replying
- [ ] Row count equals the number of test cases in the file.
- [ ] Every in-scope case was actually run, or is `not executed` with a stated reason.
- [ ] No result is `pass` without an observed outcome.
- [ ] Id and Title match the file character for character.
- [ ] Expected Result keeps every condition and number from the file, in natural language.
- [ ] No Expected or Actual Result contains a status code, endpoint, JSON, or field name.
- [ ] Every `not executed` Actual Result starts with `Not run:` and gives the reason.
- [ ] Test Data holds the values actually used (API: endpoint + payload only), is `-` for cases not run, and has no passwords, tokens or OTPs.
- [ ] Summary counts add up.
- [ ] Nothing in the report reads as a bug report or a fix suggestion.
- [ ] Only agent-browser and curl were used against the system.

### 10. Reply to the user
Show the same results table (the six columns, same wording as the report) in the reply, plus the Summary counts and the report path. If a tool or environment was unavailable, say so in one line. No bug analysis, no suggestions.
