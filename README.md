# r2sdet_AI — dMoney QA Practice Workspace

**r2sdet_AI** ("Road to SDET") is a hands-on workspace for practising QA and SDET skills with AI assistance. It contains **dMoney**, a mobile financial service (MFS) platform similar to bKash or Nagad, made up of a REST API and a web frontend. Alongside the code are Claude Code skills and agents for analysing requirements, hunting bugs, designing tests and reviewing security.

> ⚠️ **This system has known bugs and security flaws, and they are there on purpose.** dMoney is a practice target. It ships with weaknesses such as a default JWT secret, an OTP dev bypass, open CORS, IDOR and path traversal. These are documented in [`dmoney-transaction-api/qa-findings/`](dmoney-transaction-api/qa-findings/). **Do not deploy it to production or expose it to the internet.**

---

## Repository layout

```
r2sdet_AI/
├── dmoney-transaction-api/   # Backend: Node.js + Express + Sequelize + MySQL
│   ├── routes/               # Route definitions (mounted at "/", no /api prefix)
│   ├── controllers/          # users/* and transactions/* business logic
│   ├── sequelizeModel/       # Models; sync() creates tables and seeds accounts
│   ├── services/             # Balance, limits, email, transaction-ID helpers
│   ├── migrations/           # One-off, idempotent schema scripts
│   ├── swagger/              # OpenAPI specs (user + transaction)
│   ├── qa-findings/          # Documented bugs, test cases, charters, security findings
│   ├── .artifacts/           # AI-generated requirement, review, impact, charter, test and result reports
│   ├── performance/          # k6 load tests (Send Money under a staged load)
│   ├── .claude/              # Project skills and agents (qa-agent, qa-agent-advocate, …)
│   └── endpoints.md          # Authoritative endpoint catalog with curl examples
│
├── dmoney-web-react/         # Frontend: Next.js 15 (App Router) + TypeScript + MUI + Tailwind 4
│   ├── src/app/              # Pages per role: admin/, agent/, customer/, merchant/
│   ├── src/components/       # DashboardLayout, LeftMenu, Pagination, SelfStatement, PWAProvider
│   ├── src/lib/api.ts        # Shared axios instance (JWT + secret-key headers)
│   ├── src/middleware.ts     # Cookie-based route protection
│   ├── api_doc/              # API_ENDPOINTS.md + Postman collections
│   ├── dmoney-reactjs/       # Legacy Create React App version (reference only)
│   └── README.md             # Full Business Requirements Document (BRD)
│
├── sql_scripts/              # MySQL dump of dmoneydb (schema + seed data)
├── class_notes/              # Course notes and NotebookLM mind maps on AI-driven QA
├── graphify-out/             # graphify knowledge graph (graph.json, graph.html, GRAPH_REPORT.md)
├── .serena/                  # Serena project config and memories (also one per subproject)
├── .claude/skills/           # Workspace-level Claude Code skills (blast-radius, pr-review, test-design, …)
├── .claude/agents/           # Workspace-level subagents (qa-reviewer-agent, test-executor-agent)
├── .mcp.json                 # Project MCP servers (playwright, jira)
├── GRAPHIFY_SETUP.md         # How to install graphify and its git hooks
└── SERENA_SETUP.md           # How to install Serena and its Claude Code hooks
```

---

## Architecture

```
┌──────────────────────────┐        HTTP + JWT          ┌──────────────────────────┐
│     dmoney-web-react     │  Authorization: Bearer     │  dmoney-transaction-api  │
│  Next.js 15 · MUI · TS   │  X-AUTH-SECRET-KEY         │  Express · Sequelize     │
│  http://localhost:3000   │ ─────────────────────────▶ │  http://localhost:5000   │
└──────────────────────────┘                            └────────────┬─────────────┘
                                                                     │
                                                         ┌───────────▼───────────┐
                                                         │   MySQL (dmoneydb)    │
                                                         │ Users · Transactions  │
                                                         │ Commissions · Limits  │
                                                         └───────────────────────┘
```

- **Roles:** SYSTEM (internal), Admin, Agent, Customer and Merchant.
- **Login takes two steps.** `POST /user/login` sends a 4-digit OTP that expires in 2 minutes, and `POST /user/verify-otp` returns the JWT. Admin and SYSTEM accounts skip the OTP.
- **There is no balance column.** `Transactions` is an append-only double-entry ledger, and an account's balance is computed as `SUM(credit) - SUM(debit)`.
- **Business rules are stored in the database.** Fees come from the `Commissions` table and customer daily/monthly caps come from `TransactionLimits`.
- **Main operations:** deposit (cash-in), withdraw (cash-out), send money (P2P), merchant payment, admin deposit to SYSTEM, and bank cash-in through Stripe.

For the full business rules (validation, limits, fees, error codes), read the BRD in [`dmoney-web-react/README.md`](dmoney-web-react/README.md).

---

## Prerequisites

| Tool    | Version                   |
|---------|---------------------------|
| Node.js | 20.x or newer (CI uses 20.x) |
| npm     | comes with Node.js        |
| MySQL   | 8.x (or a compatible MariaDB) |

You only need a Stripe test account if you want to use the bank cash-in feature. SMTP or Gmail credentials are optional, because OTPs and reset tokens are also printed to the API console.

The AI and testing tooling is optional too:

| Tool | Needed for |
|---|---|
| [Claude Code](https://claude.com/claude-code) | The [skills, agents and plugins](#claude-code-skills-agents-and-plugins) |
| [uv](https://docs.astral.sh/uv/) | [graphify and Serena](#ai-code-intelligence-graphify-and-serena) |
| [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) | The [performance tests](#performance-testing-k6) |
| `agent-browser` | UI steps run by `execute-test` / `test-executor-agent` (API steps use `curl`) |
| [GitHub CLI](https://cli.github.com/) (`gh`) | Skills that read or create issues and PRs (`understand-task`, `pr-review`) |

---

## Installation guide

These steps set up dMoney on a fresh Windows machine. On Linux or macOS the steps are the same, except that you install MySQL with your package manager and don't need to edit `PATH`.

### 1. Install the tools

1. Install [Node.js](https://nodejs.org/) if you don't have it.
2. Install [VS Code](https://code.visualstudio.com/) if you don't have it.
3. Install [MySQL Server 8.0](https://dev.mysql.com/downloads/mysql/8.0.html) (version 8.0.36) if you don't have it.
   - Add the MySQL `bin` folder to the system `PATH` environment variable:
     ```
     C:\Program Files\MySQL\MySQL Server 8.0\bin
     ```
   - Open a new Command Prompt and check that it works:
     ```cmd
     mysql --version
     ```
4. Install [DBeaver](https://dbeaver.io/download/) and connect it to your MySQL server. Any MySQL client works, for example Beekeeper Studio.

### 2. Get the code

Clone both projects:

```bash
git clone https://github.com/salmansrabon/dmoney-transaction-api
git clone https://github.com/salmansrabon/dmoney-web-react
```

If you are using this workspace, both projects are already here and you can skip this step.

### 3. Create and restore the database

1. In DBeaver, create a database named `dmoneydb`:
   ```sql
   CREATE DATABASE dmoneydb;
   ```
2. Restore the database dump into `dmoneydb`. The dump is in this repo at [`sql_scripts/local-dmoneydb-202604201925.sql`](sql_scripts/local-dmoneydb-202604201925.sql), and you can also [download it from Google Drive](https://drive.google.com/file/d/1RFlK1bm6vpKPT-C2lmeUCfWVqa15vLWU/view?usp=drive_link). In DBeaver, right-click `dmoneydb` and choose **Tools → Restore database**, or open the `.sql` file in a SQL editor and run it.

> **Restoring on Linux or macOS?** The dump was exported on Windows, so its table names are lowercase (`users`, `transactions`, ...). Linux MySQL treats table names as case-sensitive, but the API expects `Users`, `Transactions`, `Commissions`, `Roles` and `TransactionLimits`. Fix the names before you import the dump:
>
> ```bash
> sed -E 's/`commissions`/`Commissions`/g; s/`roles`/`Roles`/g; s/`transactionlimits`/`TransactionLimits`/g; s/`transactions`/`Transactions`/g; s/`users`/`Users`/g' \
>   sql_scripts/local-dmoneydb-202604201925.sql > /tmp/dmoneydb-fixed.sql
> mysql -u root -p dmoneydb < /tmp/dmoneydb-fixed.sql
> ```
>
> Restoring the dump is optional. If `dmoneydb` is empty, the API creates the tables and seeds the [test accounts](#test-accounts) on first start.

### 4. Configure and run the backend

1. In `dmoney-transaction-api`, create a `.env` file and copy the contents of `.env.example` into it. Set `DB_USER` and `DB_PASSWORD` to match your MySQL login.
2. Create a Gmail app password at <https://myaccount.google.com/apppasswords>. You must turn on 2-Step Verification before Google lets you create one.
3. In `.env`, set `EMAIL_USER` to your Gmail address and `EMAIL_PASS` to the app password.
4. Sign up for [Stripe](https://dashboard.stripe.com/register) and set `STRIPE_SECRET_KEY` to your own test secret key.
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```
6. The API is now running at <http://localhost:5000>.

### 5. Configure and run the frontend

1. In `dmoney-web-react`, create a `.env` file and copy the contents of `.env.example` into it.
2. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to your own Stripe test publishable key.
3. Install, build and run:
   ```bash
   npm install
   npm run build
   npm run dev
   ```
4. Open <http://localhost:3000/> in your browser.

The sections below explain each part of the setup in more detail.

---

## Getting started

### 1. Create the database

```sql
CREATE DATABASE dmoneydb;
```

You don't need to create any tables. The Sequelize models create them and seed the default accounts the first time the API starts.

### 2. Run the backend API

```bash
cd dmoney-transaction-api
npm install

cp .env.example .env
cp .env.example .env.dev   # db.js reads .env.dev; everything else reads .env
# Edit both files and set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (and DB_PORT if not 3306)

npm run dev                # nodemon, auto-restarts on changes
# or
npm start                  # plain node
```

The API listens on `PORT` from `.env` (default `5000`). To check that it is running, open `GET http://localhost:5000/`.

> **Why are there two env files?** `sequelizeModel/db.js` loads `.env.dev` through `custom-env`, while the JWT middleware and other modules load `.env` through `dotenv`. Keep the `DB_*` values the same in both.

#### Key backend variables

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | MySQL connection |
| `ACCESS_TOKEN_SECRET`, `expires_in` | JWT signing secret and lifetime |
| `PARTNER_KEY` | Expected value of the `X-AUTH-SECRET-KEY` header (`ROADTOSDET`) |
| `DEFAULT_OTP` | OTP accepted by the `?env=dev` bypass on `verify-otp` |
| `STRIPE_SECRET_KEY` | Stripe bank cash-in |
| `FRONTEND_URL` | Used in password-reset links |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `SEND_MAIL` | SMTP for OTP and notification emails |

#### Migrations (optional)

Migrations are standalone scripts, not a migration framework. Each one checks the schema before changing it, so it is safe to run more than once:

```bash
node migrations/add_status_to_users.js
node add_role_index.js
```

### 3. Run the web frontend

```bash
cd dmoney-web-react
npm install

cp .env.example .env
# NEXT_PUBLIC_API_URL=http://localhost:5000
# NEXT_PUBLIC_SECRET_KEY=ROADTOSDET
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

npm run dev                # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with Turbopack on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serves the build on port **3006** |
| `npm run prod` | Builds, then starts on port 3006 |
| `npx tsc --noEmit` | Type-check (there is no lint script or test runner) |

---

## Test accounts

The API seeds these accounts on first start. They all use the password **`1234`**.

| Role     | Email                              | Phone         |
|----------|------------------------------------|---------------|
| System   | `system@dmoney.com`                | `SYSTEM`      |
| Admin    | `admin@dmoney.com`                 | `01686606909` |
| Agent    | `salmansrabon+agent@gmail.com`     | `01686606901` |
| Customer | `salmansrabon+customer1@gmail.com` | `01686606902` |
| Customer | `salmansrabon+customer2@gmail.com` | `01686606903` |
| Merchant | `salmansrabon+merchant@gmail.com`  | `01686606905` |

When you log in as Agent, Customer or Merchant, the OTP is printed in the API console. You can also use the documented dev bypass: `POST /user/verify-otp?env=dev` with `"otp": "0000"`.

---

## API documentation

| Resource | Location |
|---|---|
| Endpoint catalog with curl examples (authoritative) | [`dmoney-transaction-api/endpoints.md`](dmoney-transaction-api/endpoints.md) |
| Swagger UI: users | `http://localhost:5000/api-docs/user` |
| Swagger UI: transactions | `http://localhost:5000/api-docs/transaction` |
| Endpoint summary | [`dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md`](dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md) |
| Postman collections | [`dmoney-web-react/api_doc/`](dmoney-web-react/api_doc/) |

Protected routes need two headers:

```
Authorization: Bearer <JWT>
X-AUTH-SECRET-KEY: ROADTOSDET
```

---

## QA artefacts

**Findings** ([`dmoney-transaction-api/qa-findings/`](dmoney-transaction-api/qa-findings/))

| File | Contents |
|---|---|
| [`01-login-auth-bugs.md`](dmoney-transaction-api/qa-findings/01-login-auth-bugs.md) | Login and authorization bugs |
| [`02-deposit-bugs.md`](dmoney-transaction-api/qa-findings/02-deposit-bugs.md) | Deposit / cash-in bugs |
| [`03-deposit-test-cases.md`](dmoney-transaction-api/qa-findings/03-deposit-test-cases.md) | 23 deposit test cases. Section 3 is a prioritised table with a one-line expected result and a type tag (Sanity / Feature / Regression / Security / System Architecture / Non-functional) |
| [`04-security-vulnerabilities.md`](dmoney-transaction-api/qa-findings/04-security-vulnerabilities.md) | 11 confirmed security issues with repro steps and suggested fixes |
| [`05-deposit-test-charters.md`](dmoney-transaction-api/qa-findings/05-deposit-test-charters.md) | 6 exploratory test charters for deposit / cash-in, plus a session report template |
| [`06-deposit-cash-in-test-design.md`](dmoney-transaction-api/qa-findings/06-deposit-cash-in-test-design.md) | 64 deposit / cash-in test cases traced to 17 requirement highlights, prioritised High / Mid / Low |
| [`07-cash-in-bugs.md`](dmoney-transaction-api/qa-findings/07-cash-in-bugs.md) | 19 cash-in bugs (CASHIN-*) across Deposit, Admin Deposit and Stripe cash-in, such as the missing-account crash, the deposit deadlock and Stripe double credit |
| [`08-send-money-bugs.md`](dmoney-transaction-api/qa-findings/08-send-money-bugs.md) | 7 Send Money bugs (SM-H01 to SM-L03), filed as GitHub issues #1–#7 |

**Generated reports** ([`dmoney-transaction-api/.artifacts/`](dmoney-transaction-api/.artifacts/))

| File(s) | Contents | Made with |
|---|---|---|
| [`otp.test.md`](dmoney-transaction-api/.artifacts/otp.test.md) | OTP two-step login test cases | `test-design` |
| [`transaction-limits.report.md`](dmoney-transaction-api/.artifacts/transaction-limits.report.md) | How customer daily / monthly limits are enforced, and the gaps found | analysis |
| [`blast-radius-vs-graphify.report.md`](dmoney-transaction-api/.artifacts/blast-radius-vs-graphify.report.md) | Comparison of the `blast-radius` skill and the graphify graph for impact analysis | analysis |
| `SM-*_requirement.md` (7 files, e.g. [`SM-H01_requirement.md`](dmoney-transaction-api/.artifacts/SM-H01_requirement.md)) | Requirement analysis of each Send Money issue: business flow, scope, risks, gaps and acceptance criteria | `analyze-requirement` |
| `SM-*_review.md` (7 files, e.g. [`SM-H01_review.md`](dmoney-transaction-api/.artifacts/SM-H01_review.md)) | Code review of PR #8 against each issue: verdict, strengths, issues graded Critical / Important / Minor | `pr-review` |
| [`PR-8_blast-radius.md`](dmoney-transaction-api/.artifacts/PR-8_blast-radius.md) | Impact of PR #8, with fan-in / fan-out, affected endpoints and pages, and requirement traceability | `blast-radius` |
| [`PR-8_test-charter.md`](dmoney-transaction-api/.artifacts/PR-8_test-charter.md) | 6 exploratory charters for PR #8 | `test-charter` |
| [`PR-8.test.md`](dmoney-transaction-api/.artifacts/PR-8.test.md) + [`PR-8.review.md`](dmoney-transaction-api/.artifacts/PR-8.review.md) | 23 test cases + a Basic Test for PR #8, and their evidence map and adversarial review record | `test-design` (API-scoped) + `qa-agent-advocate` |
| [`PR-8.test-report.md`](dmoney-transaction-api/.artifacts/PR-8.test-report.md) | Execution results for PR #8 (17 pass, 5 failed, 2 not executed). The 5 failures were then fixed in PR #9 | `test-executor-agent` |
| [`03-deposit-test-cases.test-result.md`](dmoney-transaction-api/.artifacts/03-deposit-test-cases.test-result.md), [`…high-priority.test-result.md`](dmoney-transaction-api/.artifacts/03-deposit-test-cases.high-priority.test-result.md) | Execution results for the deposit test cases (the High-priority run had 13 pass and 2 Stripe cases not executed) | `test-executor-agent` |

Before you report a new finding, check these files to see whether it is already known. The deposit charters (05) and the 64 cases in 06 were designed from the code and have not been run yet.

---

## Claude Code skills, agents and plugins

The workspace includes [Claude Code](https://claude.com/claude-code) skills and subagents for QA work. Run a skill as a slash command, for example `/find-bug` or `/pr-review 8`. Claude also picks a skill automatically when your request matches its description.

### Workspace-level skills ([`.claude/skills/`](.claude/skills/))

| Skill | Purpose | Output |
|---|---|---|
| `understand-task` | Explains a GitHub issue/PR or Jira ticket and pulls out its acceptance criteria as a table | Reply |
| `find-bug` | Full-stack bug hunt on a dMoney module. Reproduces through the UI first (`agent-browser`), then the API, using Serena, graphify and `blast-radius`. Every bug is checked by `qa-reviewer-agent` before it is written | `qa-findings/NN-<module>-bugs.md` |
| `blast-radius` | Traces everything a change against `main` can affect: importers, **fan-in / fan-out** per file and function (with the change vs `main`), endpoints, frontend pages and DB work inside the lock. Ends with a risk-ranked retest list and, when issues are named, requirement traceability | Reply, or a file on request (e.g. `.artifacts/PR-8_blast-radius.md`) |
| `pr-review` | Reviews a pull request against the issues it closes, superpowers-style. A fresh read-only reviewer subagent grades findings Critical / Important / Minor. Critical and Important findings are re-verified, and each issue gets a verdict | `.artifacts/<ISSUE ID>_review.md`, one per issue |
| `test-charter` | Writes session-based exploratory test charters (mission, risks, heuristics, oracles, time-box) and session reports | Reply, or a file on request (e.g. `.artifacts/PR-8_test-charter.md`) |
| `test-design` | Designs traceable test cases in three sections: Requirement Highlights, Test Cases, and Prioritized Test Titles. The titles section is a table per priority with a **one-line expected result** and a **type tag** (Sanity, Feature, Regression, Security, System Architecture, Non-functional) | Reply or `testing_docs/<ID>.test.md` |
| `execute-test` | Runs prepared test cases from a `*.test.md` file. UI steps use `agent-browser` and API steps use `curl`. Each case gets pass / failed / not executed | `.artifacts/<module>.test-result.md` |

### Project-level skills (`dmoney-transaction-api/.claude/skills/`, same set in `dmoney-web-react/.claude/skills/`)

These apply when you work on files in that project. Where a name clashes with a workspace skill (`find-bug`, `test-design`), use the scoped name, for example `dmoney-transaction-api:test-design`.

| Skill | Purpose |
|---|---|
| `analyze-requirement` | Turns a requirement into an 8-section analysis (flow, scope, impact, risks, gaps, edge cases) with `AC-n` acceptance criteria |
| `test-design` | Sanity and regression test design as a 7-section document: Basic Test, new vs related cases, coverage summary. It comes with a review record of evidence, assumptions and bug candidates |
| `find-bug` | Reviews code, commits or branches for high-confidence bugs |
| `validate-bug` | Validates a bug with black-, grey- and white-box evidence |
| `analyze-rootcause` | Finds the most likely root cause from logs and errors |
| `explain-code` | Explains code flow and business behaviour from the source |
| `qa-agent` / `qa-agent-advocate` | Full ticket-to-tests analysis, plus an adversarial reviewer with three modes (context prep, bug review, test case review) |

### Subagents

| Agent | Where | Role |
|---|---|---|
| `qa-reviewer-agent` | [`.claude/agents/`](.claude/agents/) | Read-only adversarial reviewer for drafted bugs. It re-derives the requirement using graphify and Serena, then marks each bug APPROVED, FLAGGED or REJECTED. A bug report is written only after it passes |
| `test-executor-agent` | [`.claude/agents/`](.claude/agents/) | Runs existing test cases through the `execute-test` skill (curl and `agent-browser` only). It never designs tests or raises bugs |
| `qa-agent` | `<project>/.claude/agents/` | Requirement analysis, bug finding, edge cases and test design |
| `qa-agent-advocate` | `<project>/.claude/agents/` | Challenges `qa-agent` findings and confirms defects only with hard evidence |

### Plugins, user-level skills and MCP servers

| Name | Type | Used for |
|---|---|---|
| [superpowers](https://github.com/obra/superpowers) | Plugin (user scope) | Development workflow skills. `requesting-code-review` is the method behind `pr-review`. Install with `claude plugin marketplace add obra/superpowers-marketplace`, then `claude plugin install superpowers@superpowers-marketplace` |
| [Serena](https://github.com/oraios/serena) | Plugin (user scope) | Symbol-level code navigation (see below) |
| `graphify` | User-level skill (`~/.claude/skills/`) | Queries the workspace knowledge graph (see below) |
| `playwright`, `jira` | Project MCP servers ([`.mcp.json`](.mcp.json)) | Browser automation, and Jira tickets. Jira needs authorising with `/mcp` |
| `dmoneydb` | User-level MCP server | **Read-only** SQL against the local `dmoneydb`, used to check facts during analysis. Test execution never uses it |

Each project also has a `CLAUDE.md` that gives AI assistants architecture notes and conventions.

### QA workflow

The skills chain into one flow. The Send Money work (issues #1–#7, PRs #8 and #9) followed it end to end:

```
find-bug ──▶ qa-reviewer-agent ──▶ qa-findings/NN-*-bugs.md ──▶ GitHub issues
                                                                      │
analyze-requirement ◀────────────────────────────────────────────────┘   (SM-*_requirement.md)
      │
      ▼
 fix on a branch ──▶ PR ──▶ pr-review (SM-*_review.md) ──▶ blast-radius (PR-N_blast-radius.md)
                                                                  │
      ┌───────────────────────────────────────────────────────────┘
      ▼
test-charter (PR-N_test-charter.md) ──▶ test-design + qa-agent-advocate (PR-N.test.md / .review.md)
      │
      ▼
test-executor-agent (PR-N.test-report.md) ──▶ fix failures ──▶ re-test ──▶ k6 performance check
```

---

## Performance testing (k6)

[`dmoney-transaction-api/performance/`](dmoney-transaction-api/performance/) holds k6 load tests. [`sendmoney-concurrency.k6.js`](dmoney-transaction-api/performance/sendmoney-concurrency.k6.js) makes customers send money to each other under a staged load of one minute:

| Time | Users |
|---|---|
| 0–30 s | 0 → 3 |
| 30–50 s | 3 → 10 (7 users join and keep sending) |
| 50–60 s | 10 → 0 |

```bash
cd dmoney-transaction-api
k6 run performance/sendmoney-concurrency.k6.js                          # local API on :5000
BASE_URL=https://<staging-host> k6 run performance/sendmoney-concurrency.k6.js
```

- **Which customers.** It reuses existing **active** customers with at least `MIN_BALANCE` (1,000 Tk) and creates no users. Senders rotate so that no customer goes over its remaining daily or monthly limit, which setup works out from the statements.
- **Pass criteria.** Every send returns 201, none fails or takes 60 s or longer, and none is skipped for lack of limit.
- **Reference run.** On the local machine, 78 sends had 0 failures, a 95th percentile of 14.5 ms and a maximum of 23 ms.
- **Running it twice in one day.** Each run uses most of the reused customers' daily limit (10 sends per UTC day). A second run on the same UTC day reports skipped sends.

Options and details are in [`performance/README.md`](dmoney-transaction-api/performance/README.md).

---

## AI code intelligence: graphify and Serena

Two optional tools give Claude Code a map of the codebase, so it reads fewer files and makes fewer wrong guesses about how code connects.

| Tool | Level | What it gives you | Setup |
|---|---|---|---|
| [graphify](https://pypi.org/project/graphifyy/) | Architecture | A knowledge graph of code and docs in [`graphify-out/`](graphify-out/). Open `graph.html` in a browser, read `GRAPH_REPORT.md`, or run `graphify explain "X"` and `graphify path "A" "B"` | [`GRAPHIFY_SETUP.md`](GRAPHIFY_SETUP.md) |
| [Serena](https://github.com/oraios/serena) | Symbol | Language-server tools over MCP: find symbol, find references, rename, symbol-level edits, and project memories in [`.serena/memories/`](.serena/memories/) | [`SERENA_SETUP.md`](SERENA_SETUP.md) |

The graph is already committed, so you don't need to build it after cloning. You do need to run `graphify hook install` after every fresh clone, because git hooks and the `merge.graphify` driver live in `.git/` and are not pushed. The hooks rebuild the graph after each commit and branch switch, and `.gitattributes` makes `graph.json` union-merge instead of conflicting. Set `GRAPHIFY_SKIP_HOOK=1` to skip the rebuild for one commit.

Serena is registered for the root and for each subproject. Only the root project has been onboarded, so only it has memories.

---

## Class notes

[`class_notes/`](class_notes/) holds course notes on AI-driven quality engineering. Each note comes with a NotebookLM mind map.

| # | Topic |
|---|---|
| 1 | [AI quality engineering architecture](class_notes/1.%20ai-quality-engineering-architecture.md) |
| 2 | [AI-driven quality engineering overview](class_notes/2.ai-driven-quality-engineering-overview.md) |
| 3 | [Software testing architecture with Claude](class_notes/3.%20software-testing-architecture-claude.md) |
| 4 | [graphify and Serena overview](class_notes/4.%20graphify_serena_overview.md) |
| 5 | [AI agents for bug discovery](class_notes/5.%20ai-agents-bug-discovery-guide.md) |
| 6 | [AI agent testing framework](class_notes/6.%20ai-agent-testing-framework.md) |

---

## Known limitations

- **No automated test suite.** The API's CI workflow runs `npm test`, but `package.json` has no `test` script, so that step fails. The `tests/*.test.js` files are manual scripts: `node tests/sendPersonalEmail.test.js <email>`.
- **Role checks happen on the backend only.** The frontend's `middleware.ts` only checks that a token cookie exists. Role gating is done by the backend (403) and by the sidebar menu (`LeftMenu.tsx`).
- `dmoney-web-react/QUICK_START.md` is out of date. Use this README instead.
- `GET /transaction/limit/:account` always returns `10000` and does not read the `TransactionLimits` table. Testers have to count today's usage from the statement.
- **No index on `Transactions.account`.** Balance reads and `SELECT … FOR UPDATE` scan, and lock, the whole table. Money-moving requests therefore wait on each other across all accounts, and response times grow with the table size. The k6 figures above come from a table of about 1,000 rows.
- **Customer test data runs out daily.** Each customer may make 10 outgoing transactions per UTC day, so repeated test runs need fresh or different customers. Fixture users can only have `@gmail.com` emails, and account status is `active`, `pending` or `suspended` (there is no `inactive`).
- **Send Money fixes are merged.** Issues #1–#7 were fixed in PR #8, and the defects its test run found were fixed in PR #9:
  - Payment and Withdraw now check the shared limit inside the lock.
  - Look-alike phone numbers are resolved to the stored account before the own-account check.
  - The limit is checked before the balance.

  Two items still need a business decision: the wording of the invalid-amount message (SM-L01), and whether an unquoted JSON `1e1` should be rejected. See [`PR-8.review.md`](dmoney-transaction-api/.artifacts/PR-8.review.md) E7.
