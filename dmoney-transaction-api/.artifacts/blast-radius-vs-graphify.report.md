# Report — Blast Radius vs Graphify

**Date:** 2026-10-03
**Scope:** What the `blast-radius` skill and the `graphify` knowledge graph each do in this workspace, how they differ, how they compare when run on the same change, and when to use which.
**Sources:** `.claude/skills/blast-radius/SKILL.md`, `~/.claude/skills/graphify/SKILL.md` + `references/{query,update,hooks}.md`, `graphify-out/{GRAPH_REPORT.md,graph.json,cost.json}`, `.gitattributes`, live runs of `graphify query / explain / path` on 2026-10-03.

---

## 1. Summary

They answer different questions:

| | **Blast Radius** | **Graphify** |
|---|---|---|
| Question it answers | *"What can **my change** break, and what should I retest?"* | *"How is **this codebase** put together, and how are X and Y connected?"* |
| Starting point | The diff vs `main` | The whole repo (code + docs) |
| Lifetime | One-off report per change | Persistent graph, reused across sessions |
| Output | Risk-ranked impact report (endpoints, pages, roles, breaks, retest list) | `graph.json`, `graph.html`, `GRAPH_REPORT.md`, query answers |

Analogy: **graphify is the map, blast-radius is the damage assessment for one road you just dug up.** The map helps you find your way around. The assessment tells you which buildings to check.

---

## 2. Side by side

| Dimension | Blast Radius | Graphify |
|---|---|---|
| Type | Project skill (instructions Claude follows) — `.claude/skills/blast-radius/` | Python tool (`graphifyy`) + global skill — `~/.claude/skills/graphify/` |
| Input | `git diff` vs merge-base with `main`: committed, staged, unstaged **and untracked** | All 162 files in the repo as of the last build |
| How links are found | Live `rg` searches for `require(...)`, `import ... from`, `router.<verb>(`, and `API.<verb>('/path')`; each hit is path-resolved | Tree-sitter AST for code (EXTRACTED edges) + LLM reading of docs (INFERRED edges) |
| Direction | Reverse only: *who depends on the changed thing* | Any direction; BFS/DFS from matched nodes |
| Depth | Transitive, up to 5 levels | BFS depth 2 by default, token budget cuts the answer |
| Precision | Symbol-level (keeps an importer only if it uses the changed export) | Node-level; label matching is substring-based |
| Backend → frontend link | Yes — matches endpoint path to `API.post('/transaction/...')` calls | No direct link. The graph knows a page imports `API`, not which URL it calls |
| Domain knowledge | Built in: auth middleware, money-movement rules, `ROLE_MENUS`, `qa-findings`, env loaders, risk table | Generic. Picks up domain facts only if they are written in docs (README, CLAUDE.md, BRD) |
| Docs coverage | Only as contract-drift checks (swagger, `endpoints.md`) | Full: BRD, READMEs, CLAUDE.md, qa-findings, agent definitions all become nodes |
| Freshness | Always current (reads the working tree) | Snapshot from the last build (2026-10-02). Uncommitted changes are invisible until `graphify update .` |
| Cost | Tokens for each run (grep + reading hits) | First build: ~449k input tokens. Code-only updates and queries: no LLM tokens |
| Confidence labels | Every row must have a traced chain; unprovable items go to **Unresolved** | Each edge tagged EXTRACTED / INFERRED / AMBIGUOUS (here: 91% / 9% / 0%) |
| Output shape | Fixed template: changed files → chains → endpoints → routes → breaks → retest list | Free-form node lists, shortest paths, community summaries, interactive HTML |
| Side effects | Read-only. Never edits, stages, or commits | Writes `graphify-out/`; has a git merge driver for `graph.json` (`.gitattributes`) |

---

## 3. How each one works

### Blast Radius (9 steps, fixed)

1. Collect every changed file vs `main` (four sources, incl. untracked).
2. Classify each file (Route, Controller, Service, Model, Auth, Page, Config…).
3. Identify changed exports/symbols from the hunks.
4. BFS over importers with `rg`, path-resolve each hit, drop comments and same-name false positives, narrow by symbol.
5. Map to entry points: `METHOD /path` + auth middleware; Next.js page → URL; role from `ROLE_MENUS`.
6. Cross-link backend endpoints to frontend callers by URL path (and the reverse).
7. Run matching side-channel checks (money movement, limits, JWT, env, localStorage, qa-findings overlap…).
8. Rate risk (Critical / High / Medium / Low).
9. Print the report.

### Graphify (build once, query many times)

1. **Build** (`/graphify`): detect files → AST extraction for code → LLM extraction for docs → merge → cluster into communities → write `graph.json`, `graph.html`, `GRAPH_REPORT.md`.
2. **Keep fresh**: `graphify update .` (code only, no LLM), `--update` (incl. docs), `graphify hook install` (rebuild after each commit), or `graphify watch`.
3. **Ask**: `graphify query "<q>"` (BFS/DFS), `graphify path "A" "B"`, `graphify explain "X"`.

Current graph: **948 nodes · 1,816 edges · 51 communities** (e.g. *Transaction Limit Checker*, *Money Movement Flows*, *Auth Middleware & Roles*, *Login Auth Security Findings*).

---

## 4. Same target, both tools

Target: a change to `checkCustomerLimits` in `dmoney-transaction-api/services/limitChecker.js`.

### Blast Radius result (worked example in the skill)

- 3 impact chains: `limitChecker#checkCustomerLimits` → `sendMoney / payment / withdraw .controller.js` → `POST /transaction/{sendmoney,payment,withdraw}` (all `authenticateJWT`).
- 5 frontend routes with roles: `/customer/send-money`, `/customer/payment`, `/customer/cash-out` (Customer), `/agent/payment` (Agent), `/merchant/cash-out` (Merchant).
- Side-channel note: `GET /transaction/limit/:account` is hardcoded and does not use this service, so the UI-shown limit may disagree.
- Overall risk: **Critical** (money movement), plus a 3-row retest table with boundary cases.

### Graphify results (run 2026-10-03)

| Command | What came back | Takeaway |
|---|---|---|
| `graphify query "limitChecker checkCustomerLimits sendMoney payment withdraw" --budget 1200` | 124 nodes at depth 2, truncated to 29. Found the 3 controllers, their handlers, `TransactionLimit` model, `getUsage()`, `startOfDay()`. Also found the README BRD rule and the CLAUDE.md business rule | Good orientation: code **and** the docs that describe the rule |
| (same query) | Also returned `Withdraw()`, `SendMoney()`, `Payment()` from `dmoney-web-react/dmoney-reactjs/` | Noise: legacy CRA app that is not built. Matched by name, not by dependency. Blast-radius excludes this folder |
| `graphify explain "checkCustomerLimits()"` | "Ambiguous: matches 4 nodes" (the service + the import binding in each controller) | Needs `path::symbol` to disambiguate |
| `graphify path "limitChecker.js" "transaction.route.js"` | No path by default; with `--undirected`: 2 hops via `payment.controller.js` | Works, but you have to know to ask |
| `graphify path "limitChecker.js" "send-money/page.tsx" --undirected` | 5 hops through `Send Money (P2P)`, a doc concept (one INFERRED edge) | Not the real link. The real link is `API.post('/transaction/sendmoney')` at `send-money/page.tsx:84`, which the graph does not model |

**Verdict on this target:** graphify found the right neighbourhood plus useful business-rule docs. It did not produce endpoint → page → role mapping, risk, or a retest list. It also added false positives that blast-radius filters out.

---

## 5. Strengths and limits

### Blast Radius

| Strengths | Limits |
|---|---|
| Starts from the actual diff, incl. untracked files | Only answers "impact of a change"; useless with no diff |
| Path-resolved, symbol-narrowed chains (low false positives) | Static grep: dynamic `require`, string-built paths go to **Unresolved** |
| Crosses the HTTP boundary (endpoint ↔ page) | Hard-wired to this repo's layout; breaks if folders move |
| Knows dMoney rules: money movement, auth, roles, limits, qa-findings | Re-does all the searching every run (token cost per run) |
| Ends with concrete, observable retest steps | Ignores docs except for contract drift |

### Graphify

| Strengths | Limits |
|---|---|
| One persistent map of code **and** docs (BRD, CLAUDE.md, qa-findings) | Snapshot — stale until rebuilt; misses uncommitted work |
| Cheap repeated queries (no LLM for code queries/updates) | First build is expensive (~449k tokens here) |
| Communities show structure you would not think to ask about | Substring label matching → name collisions (legacy CRA) |
| `path` / `explain` answer "how does A reach B?" fast | No model of HTTP calls between frontend and backend |
| Visual `graph.html` for onboarding | No risk rating, no symbol narrowing, no retest guidance |
| Generic — works on any repo or folder | Answers truncated by token budget; need tuning |

---

## 6. When to use which

| Situation | Use |
|---|---|
| "What will my change break?" / before opening a PR | **Blast Radius** |
| "What should QA retest for this branch?" | **Blast Radius** |
| New to the repo, need the big picture | **Graphify** (`GRAPH_REPORT.md`, `graph.html`) |
| "How does login reach the DB?" / "What is connected to X?" | **Graphify** (`path`, `query --dfs`) |
| "Where is this business rule written down?" | **Graphify** (docs are in the graph) |
| Reviewing someone else's PR for impact | **Blast Radius** on their branch |
| Writing test cases for a feature you don't know yet | **Graphify** to learn the area → then test design |
| Refactor touching shared code (model, `api.ts`, middleware) | **Both**: graphify to see the area, blast-radius for the exact impact |

---

## 7. Using them together

1. **Orient with graphify** — `graphify query` / `explain` on the area you are about to change. Note the docs and business rules it surfaces.
2. **Make the change.**
3. **Run blast-radius** before the PR — it gives the authoritative impact list and retest table.
4. **Refresh the graph** after merging — `graphify update .` (code only, free), or install `graphify hook install` so it rebuilds after each commit.

Possible improvement: let blast-radius read `graphify-out/graph.json` `imports_from` edges as a quick first pass, then confirm each hit with `rg` as it does now. That would cut search cost without lowering accuracy. The HTTP cross-link (step 6) would still need grep.

---

## 8. Caveats

- The graphify comparison used the graph built on 2026-10-02. A rebuild may change node counts and query results.
- The blast-radius result in §4 is the skill's own worked example. Line numbers in it match current code (`sendMoney.controller.js:61`, `payment.controller.js:72`, `withdraw.controller.js:66`, `send-money/page.tsx:84`).
- `graph.json` reports `directed: false`, but `graphify path` still needed `--undirected` to find paths. Treat "no path found" as "try `--undirected`", not as "not connected".
