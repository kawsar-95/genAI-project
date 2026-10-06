---
name: blast-radius
description: Detect every code change against main (committed, staged, unstaged, untracked) and trace its full dependency impact — direct and transitive importers, fan-in / fan-out of every changed module and symbol (with main-vs-branch deltas), affected API endpoints, frontend pages calling those endpoints, DB/model, auth, config and env — ending in a risk-ranked report. Use when the user asks for "blast radius", "what does my change impact", "impact analysis", "what will this break", "what should I retest", or before opening a PR.
---

# Blast Radius

Turn "diff vs `main`" into a traced, risk-ranked map of everything the change can affect.
**Rule: every impact row must come from a traced chain.** No guessed dependents.
**Read-only:** never edit, stage, stash, or commit.

## When to use

- "What's the blast radius of my change?", "What does this branch impact?", "What should I retest?"
- Before opening a PR, or after a refactor touching shared code.

**Don't use for:** finding bugs in the diff (`code-review`), writing test cases (`test-design`), explaining a ticket (`understand-task`).

## Workspace map

One git repo, two projects (paths below are relative to repo root):

| Project | Stack | Import style | Flow |
|---|---|---|---|
| `dmoney-transaction-api/` (**api**) | Express + Sequelize | CommonJS `require('../x')` | `app.js` → `routes/*.route.js` → `controllers/**` → `sequelizeModel/*`, `services/*` |
| `dmoney-web-react/` (**web**) | Next.js App Router, TS | ESM `import`, `@/*` = `src/*` | `src/app/**/page.tsx` → `src/components/*`, `src/lib/api.ts` → backend |

The frontend reaches the backend only over HTTP (`API.<verb>('/path')` from `@/lib/api`, raw `axios` in `src/app/login/page.tsx`). That cross-project link is traced in step 6.

## 1. Collect the change set (never skip)

```bash
git fetch origin main --quiet 2>/dev/null || true
BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main)
git diff --name-status "$BASE"...HEAD          # committed on this branch
git diff --name-status --cached                # staged
git diff --name-status                         # unstaged
git ls-files --others --exclude-standard       # untracked
```

- Combine them into one list, tagging each file's **Source** (committed / staged / unstaged / untracked) and **Status** (A / M / D / R). A file can have more than one source.
- Content: `git diff -U0 "$BASE"` covers committed + uncommitted tracked changes. For untracked files, read them directly (they are entirely new).
- **Exclude:** `node_modules/`, `.next/`, build output, `.claude/`, `dmoney-web-react/dmoney-reactjs/` (legacy, not built). Report the excluded files in one line.
- **Lockfiles** (`package-lock.json`): don't trace them. Record them as a "dependency version change" under Config.
- If `BASE` == `HEAD` and nothing is uncommitted: reply `No changes vs main.` and stop.
- If there is no `main`/`origin/main`, say so and ask which base to use. Stop.

## 2. Classify each changed file

| Path | Category | Default impact |
|---|---|---|
| api `routes/*.route.js` | Route | Endpoints added/removed/re-wired directly |
| api `controllers/**` | Controller | Endpoints bound to the changed handlers |
| api `services/*` | Service | Requiring controllers → their endpoints |
| api `sequelizeModel/*`, `db.js` | Model/DB | Every requirer; `sync()`/seed/column change = whole table |
| api `migrations/*`, `add_role_index.js` | Migration | DB-wide |
| api `jwtMiddleware.js` | Auth | Every route using the changed middleware export |
| api `app.js`, `server.js` | App wiring | All endpoints |
| api `utils/*` | Utility | Requirers |
| api `swagger/*`, `endpoints.md`, `qa-findings/*` | Docs | Contract-drift check only |
| web `src/lib/api.ts` | HTTP client | Every file importing `API` |
| web `src/middleware.ts`, `src/app/login/page.tsx` | Auth/session | All authenticated routes |
| web `src/components/*` | Shared component | Importing pages/layouts |
| web `src/app/**/layout.tsx` | Layout | Every route below it |
| web `src/app/**/page.tsx` | Page | That route |
| `package.json`, lockfile, `.env.example`, `next.config.ts`, `tsconfig.json`, `.github/workflows/*` | Config | Project-wide |
| web `public/*` (`sw.js`, `manifest.json`) | PWA/static | All clients (cached SW) |

## 3. Identify changed symbols

From the hunks, list the exports that were **added, removed, renamed, or had their signature/behaviour changed**:
- api: `module.exports = { a, b }`, `exports.a =`, `module.exports.a =`, and the function bodies of exported handlers.
- web: `export default`, `export function/const`, component props, exported constants (e.g. `ROLE_MENUS`).

The whole file counts as changed only when top-level side-effect code changed (`sequelize.sync()`/seed rows in models, `app.use`/route mounting in `app.js`, module-level config), or when the diff is too broad to attribute to individual symbols. Say which case applies.

## 4. Trace reverse dependencies (transitive)

Do a BFS from each changed file: find its importers, then their importers, until no new files appear. **Cap depth at 5**; if hit, note it under Unresolved.

**Backend (CommonJS):**
```bash
rg -n "require\(\s*['\"][./][^'\"]*<basename>(\.js)?['\"]\s*\)" dmoney-transaction-api --glob '!node_modules'
```
**Frontend (ESM + alias):**
```bash
rg -n "from\s+['\"](@/|\.{1,2}/)[^'\"]*<module-path-no-ext>['\"]" dmoney-web-react/src
rg -n "import\(\s*['\"][^'\"]*<module-path-no-ext>['\"]" dmoney-web-react/src   # dynamic imports
```

Filter each hit:
- **Resolve the path.** Join the relative specifier with the importer's directory (`@/` → `dmoney-web-react/src/`, try `.js/.ts/.tsx` and `/index.*`) and keep the hit only if it resolves to the changed file. This removes same-basename false positives.
- **Drop comment matches.** Example: `limitChecker.js` contains a `require('../../services/limitChecker')` usage example in its own header comment.
- **Narrow by symbol** when step 3 found specific symbols. Keep an importer only if it destructures or uses that symbol (`rg -n "<symbol>" <importer>`). Others are listed as "imports file, unaffected symbol" and stop there.
- A removed/renamed export with remaining importers is a **break**. Flag it explicitly.

Record each chain: `changed#symbol → importer → … → entry point`.

## 4b. Measure fan-in / fan-out (never skip)

**Fan-in** counts what depends on a thing (importers or callers). It shows how far a change can spread. **Fan-out** counts what a thing depends on (imports, calls, DB tables). It shows how many things can break it. Measure both at `HEAD` and at `BASE`, and report the **delta**. Use `git show <sha>:<file>`, never the working tree, for the `BASE` side.

**Module level**, for each changed file:
- **Fan-in (Ca):** the path-resolved importers from step 4 (count only direct importers). Next.js pages have no importers; count their route plus any `ROLE_MENUS` link instead.
- **Fan-out (Ce):** the distinct modules the file imports:
  ```bash
  git show <sha>:<file> | grep -nE "require\(|^import "   # drop matches inside comments
  ```
- **Instability** = Ce / (Ca + Ce).
  - Near 1: a leaf, cheap to change.
  - Near 0: heavily depended on, so a change spreads.
- Note imports that are never used (`grep -c "\b<name>\b"` = 1).

**Symbol level**, for each changed or new symbol from step 3:
- **Fan-in:** call sites (`rg -n "<symbol>\(" …`), path-resolved like step 4, then carried through to endpoints and pages, e.g. `3 callers → 3 endpoints → 5 pages`. Say how many callers use any **new** parameter or field.
- **Fan-out:** the calls the symbol makes, compared between `BASE` and `HEAD`:
  ```bash
  git show <sha>:<file> | grep -noE "(<callee1>|<callee2>|…)\("   # e.g. Users\.findOne|sequelize\.(transaction|query)|Transactions\.create
  ```
  Report the count of calls and distinct targets, any call that was **added, removed or moved** (for example, into or out of a `sequelize.transaction` block or an early-return path), and what an invalid request now reaches.
- **Private helpers** (not exported) still get a row, because their fan-in shows whether a change stays contained.

**DB fan-out** (when a money-moving controller, model or service changed):
- Count the statements per request by table, **outside vs inside** the locked `sequelize.transaction`, at `BASE` and at `HEAD`.
- Work moved into a `FOR UPDATE` section lengthens the lock. `Transactions` has no `account` index, so the lock covers the whole table.

**Coupling context:**
- List the fan-in of each **unchanged** dependency the changed files use (e.g. `db` 20 files, `@/lib/api` 16).
- State plainly whether the change touches them. A high fan-in dependency that wasn't changed does **not** widen the blast radius.

Name the **changed symbol with the highest fan-in**. It sets the blast radius, and it goes on the report's summary line.

## 5. Map to entry points

**Backend endpoints.** For every controller handler reached, find the binding:
```bash
rg -n "router\.(get|post|put|patch|delete)\(" dmoney-transaction-api/routes
```
→ `METHOD /path`, plus its auth middleware: `authenticateJWT` (JWT + `X-AUTH-SECRET-KEY`), `publicAuthenticateJWT` (JWT only), or none. Routes mount at `/` (no prefix) in `app.js`.

**Frontend routes.** `src/app/<segments>/page.tsx` → URL `/<segments>` (keep `[param]`). A changed layout or component that reaches a layout affects every child route.

**Role exposure.** Look up each affected route in `ROLE_MENUS` (`src/components/LeftMenu.tsx`) to see which roles see it in the sidebar. A route missing from it is reachable only by URL. Note it, because the frontend has no role-based routing.

## 6. Cross-project link

**Backend change → frontend callers.** For each affected endpoint, grep by its static path prefix (template literals like `` `/user/update/${id}` `` match on `/user/update/`):
```bash
rg -n "API\.(get|post|put|patch|delete)\(\s*['\"\`]<path-prefix>" dmoney-web-react/src
rg -n "<path-prefix>" dmoney-web-react/src/app/login dmoney-web-react/api_doc dmoney-transaction-api/tests
```
Every caller page is an affected frontend route. Treat it like a step 5 entry point.

**Frontend change → backend.** If the diff changes an endpoint path, HTTP verb, or request payload, check that the backend route exists with that verb and that its handler reads the same `req.body`/`req.params` fields. A mismatch is a **break**.

## 7. Contract & side-channel checks

Run every check below that matches the change. Report only the ones that apply, with `file:line`.

| Trigger | Check |
|---|---|
| Handler's `req.body`/`req.params` fields or `res.status().json({...})` keys changed | Frontend consumers still send/read the same fields; `swagger/*.yaml` + `endpoints.md` drift |
| Model column / seed / `sync()` changed | Every query on that table, incl. raw SQL in `services/getBalance.js` (for `Transactions`); is a migration needed? |
| Money-moving controller (`deposit`, `withdraw`, `sendMoney`, `payment`, `adminDeposit`, `stripeCashIn`) | Still uses `sequelize.transaction` + `SELECT … FOR UPDATE` + `replacements`; debit/credit pair stays balanced |
| `Commission.js` / `TransactionLimit.js` / `limitChecker.js` | Fee and limit behaviour for **every** transaction type that reads them |
| `jwtMiddleware.js` | Every route using the changed middleware; partner-key behaviour |
| New/changed localStorage key at login | Also removed in `clearSessionAndRedirect` (`src/lib/api.ts`) |
| New page added | Present in `ROLE_MENUS` for the intended role(s) |
| Env var added/renamed | `.env.example`; api has two loaders (`custom-env` → `.env.dev` in `db.js`, `dotenv` → `.env` elsewhere); web vars need `NEXT_PUBLIC_` |
| Dependency version change | Packages whose major version moved; files importing them |
| Touches an issue in `dmoney-transaction-api/qa-findings/*` | Flag the overlap (cite finding ID). Do not propose silently "fixing" it |

## 8. Risk rating

| Level | When |
|---|---|
| **Critical** | Auth/session (`jwtMiddleware.js`, `middleware.ts`, login), money movement/ledger, migrations, `app.js`, `src/lib/api.ts` |
| **High** | Model/service with ≥3 dependents; removed/renamed export or endpoint; contract change with frontend callers; dependency major bump |
| **Medium** | Single controller/page/component with live callers |
| **Low** | Docs, styling, copy, isolated leaf with no dependents |

Give each rating a one-line rationale. Overall risk = highest row.

**Use fan-in from step 4b when rating:**
- "≥3 dependents" means a symbol-level fan-in of 3 or more.
- A dependent that is reached only through a changed symbol whose **call and behaviour are unchanged for that caller**, such as a new optional parameter it doesn't pass, gets a regression-only rating: one level lower, and the Why column says so.

## 9. Output template

Fixed order. **Omit empty sections.** No preamble, no closing summary.

```markdown
## Blast Radius — <branch> vs main (<BASE short sha>)
Changes: <n> files (<c> committed · <s> staged · <u> unstaged · <t> untracked) · Overall risk: <level> · Highest fan-in: `<symbol>` (<callers> → <endpoints> → <pages>)
Excluded: <files, one line>

### Changed files
| File | Status | Source | Category | Changed symbols |
|---|---|---|---|---|

### Impact chains
- `<changed#symbol>` → `<importer>` → … → `<METHOD /path | /route>`

### Fan-in / fan-out
#### Module level
| Changed module | Fan-in (Ca) | Fan-out (Ce) | Instability | Change vs main |
|---|---|---|---|---|

#### Symbol level
| Symbol | Fan-in: callers → endpoints → pages | Fan-out: calls / resources | Change vs main |
|---|---|---|---|

#### DB fan-out of <endpoint>   <!-- only for money-moving / model / service changes -->
| Tables touched | main (<BASE sha>) | branch (<HEAD sha>) |
|---|---|---|

#### Unchanged dependencies (coupling context)
<module> <fan-in> · … · changed by this diff: yes/no

**Takeaway:** <the symbol with the highest fan-in and why it sets the radius, in 1–2 lines>

### Affected backend endpoints
| Endpoint | Auth | Reached via | Risk | Why |
|---|---|---|---|---|

### Affected frontend routes
| Route | Roles (LeftMenu) | Reached via | Calls endpoint | Risk |
|---|---|---|---|---|

### Breaks
- <removed/renamed export still imported, or frontend↔backend contract mismatch, with file:line>

### Contract / side-channel risks
- <applicable step-7 check, with file:line>

### Requirement traceability   <!-- only when the user names issues / requirement or AC docs -->
| Issue | Requirement ACs | Changed symbol(s) | Status in this change set |
|---|---|---|---|

### Suggested verification
| # | What to check | Where | Why |
|---|---|---|---|

### Unresolved
- <dynamic requires, string-built paths, depth cap hit — anything the static trace could not prove>
```

## 10. Conciseness rules

- Bullets and tables only. One line per row; rationale ≤ ~15 words.
- Use repo-relative paths. Shorten to `api/…` / `web/…` once the meaning is clear.
- Don't paste diff hunks. Name the symbol and `file:line`.
- Suggested verification lists observable checks (endpoint + input + expected), not "test thoroughly".

## 11. Self-check before replying

- [ ] Base is the merge-base with `main`. Committed, staged, unstaged **and** untracked files are included
- [ ] Every impact row traces back to a changed file through a recorded chain
- [ ] Fan-in and fan-out were measured at module **and** symbol level, at `BASE` and `HEAD` (via `git show`), with the delta stated
- [ ] The changed symbol with the highest fan-in is named on the summary line, and the risk ratings use the fan-in counts
- [ ] Import hits were path-resolved; comment matches and same-basename false positives were removed
- [ ] Symbol-level narrowing was applied unless the change is whole-file (and that is stated)
- [ ] Every affected backend endpoint was cross-linked to its frontend callers (or "no frontend caller")
- [ ] Removed/renamed exports and contract mismatches are under **Breaks**
- [ ] Anything not statically provable is under **Unresolved**, not silently dropped
- [ ] Nothing was edited, staged, or committed

## 12. Worked example

Input: unstaged edit changing the daily-cap logic inside `checkCustomerLimits` in `dmoney-transaction-api/services/limitChecker.js`.

```markdown
## Blast Radius — main vs main (3bcaa33)
Changes: 1 file (0 committed · 0 staged · 1 unstaged · 0 untracked) · Overall risk: Critical · Highest fan-in: `checkCustomerLimits` (3 callers → 3 endpoints → 5 pages)

### Changed files
| File | Status | Source | Category | Changed symbols |
|---|---|---|---|---|
| api/services/limitChecker.js | M | unstaged | Service | `checkCustomerLimits` (body) |

### Impact chains
- `limitChecker.js#checkCustomerLimits` → `controllers/transactions/sendMoney.controller.js:61` → `POST /transaction/sendmoney`
- `limitChecker.js#checkCustomerLimits` → `controllers/transactions/payment.controller.js:72` → `POST /transaction/payment`
- `limitChecker.js#checkCustomerLimits` → `controllers/transactions/withdraw.controller.js:66` → `POST /transaction/withdraw`

### Fan-in / fan-out
#### Module level
| Changed module | Fan-in (Ca) | Fan-out (Ce) | Instability | Change vs main |
|---|---|---|---|---|
| api/services/limitChecker.js | 3 (sendMoney, payment, withdraw controllers) | 3 (`sequelize`, `db`, `TransactionLimit`) | 0.50 | Imports unchanged; `Op`/`fn`/`col`/`literal` imported but unused (pre-existing) |

#### Symbol level
| Symbol | Fan-in: callers → endpoints → pages | Fan-out: calls / resources | Change vs main |
|---|---|---|---|
| `checkCustomerLimits` | 3 → 3 → 5 (Customer ×3, Agent ×1, Merchant ×1) | `TransactionLimit.findAll` ×1 + `getUsage` ×N (N = active limit rows) | Body only; same calls, same signature |
| `getUsage` (private) | 1 (`checkCustomerLimits`) | `sequelize.query` ×1 (aggregate on `Transactions`) | Unchanged |

#### Unchanged dependencies (coupling context)
`db` 20 · `TransactionLimit` 1 · changed by this diff: no

**Takeaway:** `checkCustomerLimits` has a fan-in of 3, so a cap-logic change reaches every Customer outgoing flow. All three endpoints need boundary tests.

### Affected backend endpoints
| Endpoint | Auth | Reached via | Risk | Why |
|---|---|---|---|---|
| POST /transaction/sendmoney | authenticateJWT | sendMoney.controller | Critical | Money movement; cap gates customer debit |
| POST /transaction/payment | authenticateJWT | payment.controller | Critical | Money movement; cap gates customer debit |
| POST /transaction/withdraw | authenticateJWT | withdraw.controller | Critical | Money movement; cap gates customer debit |

### Affected frontend routes
| Route | Roles (LeftMenu) | Reached via | Calls endpoint | Risk |
|---|---|---|---|---|
| /customer/send-money | Customer | send-money/page.tsx:84 | POST /transaction/sendmoney | Critical |
| /customer/payment | Customer | payment/page.tsx:83 | POST /transaction/payment | Critical |
| /customer/cash-out | Customer | cash-out/page.tsx:83 | POST /transaction/withdraw | Critical |
| /agent/payment | Agent | agent/payment/page.tsx:83 | POST /transaction/payment | Medium |
| /merchant/cash-out | Merchant | merchant/cash-out/page.tsx:80 | POST /transaction/withdraw | Medium |

### Contract / side-channel risks
- Limits read from `TransactionLimits` (`sequelizeModel/TransactionLimit.js`) — cap semantics change for all three types.
- `GET /transaction/limit/:account` is hardcoded and does not use this service — UI-shown limit may now disagree (known gap).

### Suggested verification
| # | What to check | Where | Why |
|---|---|---|---|
| 1 | Customer send just under / at / over the daily cap → success / success / rejected | POST /transaction/sendmoney | Boundary of changed logic |
| 2 | Same boundary for payment and withdraw | POST /transaction/payment, /withdraw | Shared service |
| 3 | Agent payment and merchant cash-out unaffected by customer caps | /agent/payment, /merchant/cash-out | Service applies to Customers only |
```
