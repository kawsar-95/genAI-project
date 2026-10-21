---
name: find-bug
description: Full-stack bug hunt on a dMoney module (API + React frontend). Uses Grep/Glob/Read for symbol and caller tracing, graphify for domain knowledge, /blast-radius for change impact, and agent-browser to reproduce through the UI first, falling back to API-only. Outputs a report grouped by High / Medium / Low priority with confidence. Use when the user asks to "find bugs in <module>", "bug hunt", "explore <feature> for defects", or "find-bug".
---

# Find Bug (full stack)

Find evidence-backed bugs in a module, reproduce them **frontend first, then API**, and write a two-section report.

**Hard rules**
1. The code trace **and** graphify **and** `/blast-radius` are mandatory in every run (see steps 2-4). Never skip one silently; if one is unavailable, say so in the Summary.
2. Reproduce through the **frontend first** with `agent-browser`. Only if the UI cannot trigger it, use the backend API alone, and say why.
3. Every bug's steps use **both channels**: the UI action, then an API check of the result (or the reverse for API-only bugs).
4. Report only what you observed or traced. A code-only suspicion is allowed but must be labelled so and carry Low/Medium confidence.
5. **No suggested fixes, no fix ordering.**
6. Read-only on source code. Never edit application code. Do not edit data except through the app's own UI/API as a normal user would; use read-only SQL for checks.

## Workspace

| Project | Path | Notes |
|---|---|---|
| API | `dmoney-transaction-api/` | Express + Sequelize + MySQL. Routes → controllers → models/services. `endpoints.md` has routes, curl examples and **seeded test credentials**. |
| Web | `dmoney-web-react/` | Next.js App Router. `src/app/<role>/<feature>/page.tsx`. BRD is `dmoney-web-react/README.md`. |

## Steps

### 1. Scope and known issues
- Confirm the module/feature to hunt (e.g. "cash-in"). Ask only if it is truly ambiguous.
- Read `dmoney-transaction-api/qa-findings/*.md` first. Anything already listed is **KNOWN**: do not re-report it as new (mention it in the Summary if you re-confirmed it).
- Read the module's BRD section in `dmoney-web-react/README.md` for the expected behaviour.

### 2. Code trace: code relationships (mandatory)
- Trace with `Glob`, `Grep` and `Read`, not whole-file reads:
  - `Glob` for each controller / model / page in scope
  - `Read` with a line range only for the functions you need
  - `Grep` to trace callers and shared helpers (e.g. who calls `getBalance`, `Commission.getConfig`; which pages call each endpoint)
- Use `Grep` to find repeated defect patterns across files (same bug in other places).

### 3. graphify: domain knowledge (mandatory)
- Read `graphify-out/GRAPH_REPORT.md`, then query the graph, e.g. `/graphify query "<module> flow"` (add `--dfs` to trace one path).
- Use it for: business rules and their relationships, god nodes, cross-module links, communities the module touches.
- Check freshness: compare `graphify-out/manifest.json` date with `git log -1 --format=%cd`. If stale, say so in the Summary; do **not** rebuild without asking.

### 4. /blast-radius (mandatory)
- Invoke the `blast-radius` skill.
- If it reports changes vs `main`, use its traced impact (affected endpoints, frontend pages, DB, auth) to widen the hunt.
- If it reports `No changes vs main.`, record that, then apply the same tracing manually for the module: route → controller → model/service → frontend page that calls it (code trace + graphify).

### 5. Build candidates
List candidate bugs from steps 2-4 against the BRD. Check at least: validation and boundaries, auth/role/ownership, state (active/suspended), concurrency and atomicity, idempotency, error handling (unhandled rejections, status codes), money precision and rounding, UI/API contract mismatches, UI error/loading states, display of fees and balances.

### 6. Reproduce: frontend first with agent-browser
- Check the tool: `command -v agent-browser`. If missing, tell the user (`npm install -g agent-browser`, then `agent-browser install`) and go API-only for everything, noting this in the Summary. Run `agent-browser --help` once to confirm command names for the installed version.
- Check the app is up (API port from `.env`, web usually `3006`) and that the target is **local/dev** (localhost). Never submit transactions against a non-local environment.
- Log in with the seeded accounts in `endpoints.md` (non-admin roles need the OTP step).
- Typical loop: `open <url>` → `snapshot` → `fill` / `click` using the element refs → `snapshot`/read text → `screenshot` for evidence.
- Stripe flows: test mode only, card `4242 4242 4242 4242`.
- Then verify the effect through the API (`curl` with `Authorization: Bearer <jwt>` and `X-AUTH-SECRET-KEY`), e.g. `GET /transaction/balance/<phone>`, or read-only SQL on `Transactions`.

### 7. Fall back to API only when the UI can't reproduce
Use the API alone when: the UI blocks the input (client-side validation), the condition needs concurrency or crafted requests, the page does not exist for that role, or `agent-browser` is unavailable. In the bug's steps state `Frontend: not reproducible - <reason>` and write the steps as API calls.

### 8. Classify
Priority (impact-based; never inflate or deflate):
- **High**: incorrect financial result, money lost or minted, security breach, server crash/DoS, key workflow blocked with no workaround.
- **Medium**: feature partly works or wrong behaviour with a workaround; limited-scope validation/integration issues.
- **Low**: cosmetic, text, minor usability, hardening with little impact.

Confidence (evidence-based):
- **High**: reproduced end to end (UI and/or API) and matches a requirement.
- **Medium**: strong code trace, or reproduced on one channel only; one material check missing. Say which.
- **Low**: depends on unverified assumptions; include only if clearly useful and label it code-trace only.

Drop anything that is not a bug (matches BRD, accepted design). Skip duplicates of KNOWN issues unless you found a materially new angle.

### 9. Write the report
File: `dmoney-transaction-api/qa-findings/<NN>-<module>-bugs.md`, where `NN` = highest existing number + 1 (two digits). Use exactly this structure and no other sections.

````markdown
# <Module> Bugs

## Section 1: List of Bugs

### High Priority

#### <PREFIX>-H01
- **Bug Id:** <PREFIX>-H01
- **Bug Title:** [Module] <action produces incorrect result under specific condition>
- **Confidence:** High | Medium | Low
- **Step to reproduce:**
  1. [UI] <actor, page, exact input and action>
  2. [UI] <next action>
  3. [API] <request and what to check, e.g. GET /transaction/balance/<phone>>
  - (If the UI cannot trigger it: `Frontend: not reproducible - <reason>`, then API-only steps.)
- **Expected result:** <per BRD / contract>
- **Actual result:** <what was observed; for code-trace-only items, say "not executed">

### Medium Priority
(same bug block)

### Low Priority
(same bug block)

## Section 2: Summary

| Priority | Count | High conf. | Medium conf. | Low conf. |
|---|---|---|---|---|

| Bug Id | Title | Priority | Confidence | Reproduced via |
|---|---|---|---|---|

- **Scope covered:** files, endpoints, pages.
- **Tools used:** code trace (what was traced), graphify (graph date, fresh/stale), /blast-radius (result), agent-browser (used / unavailable).
- **Already known (re-confirmed, not re-listed):** IDs from earlier qa-findings.
- **Not verified / limitations:** anything you could not run or check.
````

Rules for the report:
- `PREFIX` = short module code (e.g. `CASHIN`); IDs run `H01…`, `M01…`, `L01…` within the report.
- Omit an empty priority heading's bugs but keep the heading with `None found.`
- Order bugs inside a priority group by confidence (High first).
- No fix suggestions, no "suggested fix order", no next-steps section.

### 10. Reply to the user
One short message: the report path, counts per priority, and any tool that was unavailable or stale. Do not paste the whole report.
