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
│   ├── qa-findings/          # Documented bugs, test cases, security findings
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
└── .claude/skills/           # Workspace-level Claude Code skills
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

| File | Contents |
|---|---|
| [`qa-findings/01-login-auth-bugs.md`](dmoney-transaction-api/qa-findings/01-login-auth-bugs.md) | Login and authorization bugs |
| [`qa-findings/02-deposit-bugs.md`](dmoney-transaction-api/qa-findings/02-deposit-bugs.md) | Deposit / cash-in bugs |
| [`qa-findings/03-deposit-test-cases.md`](dmoney-transaction-api/qa-findings/03-deposit-test-cases.md) | Deposit test cases |
| [`qa-findings/04-security-vulnerabilities.md`](dmoney-transaction-api/qa-findings/04-security-vulnerabilities.md) | 11 confirmed security issues with repro steps and suggested fixes |
| [`.artifacts/otp.test.md`](dmoney-transaction-api/.artifacts/otp.test.md) | OTP two-step login test cases |

Before you report a new finding, check these files to see whether it is already known.

---

## Claude Code skills

The workspace includes [Claude Code](https://claude.com/claude-code) skills for QA work. Run them as slash commands, for example `/find-bug`.

**Workspace level** ([`.claude/skills/`](.claude/skills/))

| Skill | Purpose |
|---|---|
| `blast-radius` | Traces the full dependency impact of changes against `main` and produces a risk-ranked retest report |
| `understand-task` | Explains a GitHub issue/PR or Jira ticket and pulls out its acceptance criteria as a table |

**Per project** (`dmoney-transaction-api/.claude/` and `dmoney-web-react/.claude/`)

| Skill | Purpose |
|---|---|
| `analyze-requirement` | Turns a requirement into testable acceptance criteria |
| `test-design` | Designs sanity tests from tickets, PRs or commits |
| `find-bug` | Reviews code, commits or branches for high-confidence bugs |
| `validate-bug` | Validates a bug with black-, grey- and white-box evidence |
| `analyze-rootcause` | Finds the most likely root cause from logs and errors |
| `explain-code` | Explains code flow and business behaviour from the source |
| `qa-agent` / `qa-agent-advocate` | Full ticket-to-tests analysis, plus an adversarial reviewer |

Each project also has a `CLAUDE.md` that gives AI assistants architecture notes and conventions.

---

## Known limitations

- **No automated test suite.** The API's CI workflow runs `npm test`, but `package.json` has no `test` script, so that step fails. The `tests/*.test.js` files are manual scripts: `node tests/sendPersonalEmail.test.js <email>`.
- **Role checks happen on the backend only.** The frontend's `middleware.ts` only checks that a token cookie exists. Role gating is done by the backend (403) and by the sidebar menu (`LeftMenu.tsx`).
- `dmoney-web-react/QUICK_START.md` is out of date. Use this README instead.
- `GET /transaction/limit/:account` always returns `10000` and does not read the `TransactionLimits` table.
