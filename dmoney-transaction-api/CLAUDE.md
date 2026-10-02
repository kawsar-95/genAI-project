# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`dmoney-transaction-api` is a Node.js/Express + MySQL (Sequelize) backend for **dMoney**, a mobile-money style wallet system (think bKash/Nagad clone) with roles SYSTEM, Admin, Agent, Customer, Merchant. It is built as a **deliberately imperfect training/QA target** (part of the `r2sdet_AI` — "road to SDET" — workspace): the `qa-findings/` directory and `.claude/skills/` (`qa-agent`, `find-bug`, `validate-bug`, etc.) exist specifically to practice requirement analysis, bug hunting, and security review against this codebase. **Do not silently "fix" known issues documented in `qa-findings/` or treat them as accidental** — confirm with the user whether a task is "fix this bug" or "find/validate bugs for QA practice" before changing security-sensitive code.

There is no `README.md`; `endpoints.md` is the authoritative, up-to-date endpoint catalog (routes, curl examples, seeded test credentials) and `swagger/API_ENDPOINTS_SUMMARY.md` / the live Swagger UIs are secondary references.

## Commands

```bash
npm run dev     # nodemon server.js — auto-restart dev server
npm start       # node server.js — plain start
```

- **No test runner is configured.** `package.json` has no `test` script even though `.github/workflows/node.js.yml` CI runs `npm test` on push/PR to `main` — expect that CI step to fail until a real test script exists. The files under `tests/*.test.js` are standalone manual scripts (run directly with `node tests/sendPersonalEmail.test.js <email>`), not a Jest/Mocha suite.
- **Migrations are one-off scripts, not a migration framework.** Each file in `migrations/` (and `add_role_index.js` at the repo root) is idempotent and self-checks before altering schema. Run them manually when needed, e.g. `node migrations/add_status_to_users.js`. Sequelize models also call `sequelize.sync()` on load to create tables and seed fixed rows (SYSTEM/Admin/Agent/Customer/Merchant accounts in `Users.js`, a `TRNX1001` SYSTEM seed transaction in `Transactions.js`).
- Server listens on `process.env.PORT` (default from `.env`: `5000`).
- Swagger UIs: `/api-docs/user` and `/api-docs/transaction`, built from `swagger/swaggerUser.yaml` / `swagger/swaggerTrnx.yaml` via `swagger/swagger.js`.

### Environment files — two loaders, two files

- `sequelizeModel/db.js` loads config via `require('custom-env').env('dev')`, which reads **`.env.dev`** (gitignored, not present by default).
- Everything else (`jwtMiddleware.js`, `tests/*`, etc.) uses plain `require('dotenv').config()`, which reads **`.env`**.
- Locally you need both files (or at least `.env.dev` with matching `DB_*` values) — `.env.example` shows the full variable set: `DB_HOST/NAME/USER/PASSWORD/PORT`, `ACCESS_TOKEN_SECRET`, `PARTNER_KEY` (the `X-AUTH-SECRET-KEY` value), `expires_in`, `DEFAULT_OTP`, `STRIPE_SECRET_KEY`, `FRONTEND_URL`, `EMAIL_*`.

## Architecture

**Request flow:** `server.js` → `app.js` (Express app, CORS/morgan/body-parsing, Swagger mounts, 404 + global error handler) → `routes/*.route.js` → `controllers/**/*.controller.js` → `sequelizeModel/*` (Sequelize models) and `services/*` (cross-cutting helpers). Routes are flat and mounted at `/` (no `/api` prefix) in `app.js`.

**Auth:** `jwtMiddleware.js` exports two middlewares used inconsistently on purpose/by accident across routes:
- `authenticateJWT` — requires both a valid `Authorization: Bearer <JWT>` *and* a matching `X-AUTH-SECRET-KEY` header (checked against `PARTNER_KEY`).
- `publicAuthenticateJWT` — requires only a valid JWT, **no partner-key check** — despite the name, it does not mean "no auth." It's wired to some `user/*` read endpoints that arguably should use the full `authenticateJWT` (see `qa-findings/04-security-vulnerabilities.md` S-3).

Login is two-step for non-admin roles: `POST /user/login` (identity+password) issues a 4-digit OTP (emailed if the address is `@gmail.com`, always logged to console) with a 2-minute expiry; `POST /user/verify-otp` exchanges the OTP for a JWT. Admin and the `SYSTEM` account skip OTP and get a JWT directly from `/user/login`. `?env=dev` + `DEFAULT_OTP` on `verify-otp` is a documented bypass (see security findings) — treat it as intentional/known, not something to silently patch.

**Ledger / balance model:** There is no `balance` column anywhere. `Transactions` is an append-only double-entry ledger: every transfer writes one or more rows with `account`, `debit`, `credit`, `from_account`, `to_account`, `trnxId`, `transaction_type`. Balance for any `account` (which is always a `phone_number`, or the literal string `"SYSTEM"`) is `SUM(credit) - SUM(debit)`, computed on the fly:
- `services/getBalance.js` — simple read path, builds the SQL by **string concatenation** (not parameterized — contrast with the controllers below).
- Transaction-writing controllers (`deposit`, `withdraw`, `sendMoney`, `payment`, `adminDeposit`) instead run the balance check *inside* a `sequelize.transaction(...)` using `SELECT ... FOR UPDATE` with parameterized `replacements`, to lock the account's rows and prevent concurrent overdraw/cap-breach before writing the debit/credit pair. Follow that locking pattern (`READ_COMMITTED` + `FOR UPDATE` + replacements) for any new money-moving endpoint rather than the raw-concat style in `getBalance.js`.

**Business rules are DB-config-driven, not hardcoded** (mostly):
- `sequelizeModel/Commission.js` — `Commission.getConfig(transaction_type)` reads the `Commissions` table for fee rates/min/max per transaction type (Deposit/Withdraw/SendMoney/Payment), with hardcoded fallback defaults in each controller if no rule rows exist.
- `services/limitChecker.js` — `checkCustomerLimits(phone, totalDebit)` enforces daily/monthly cumulative amount + count caps from the `TransactionLimits` table for outgoing Customer transactions (SendMoney/Payment/Withdraw). Note `GET /transaction/limit/:account` itself is currently hardcoded to `10000` and does **not** consult this table/service (known gap).
- Deposit (`controllers/transactions/deposit.controller.js`) has two distinct flows gated by whether `from_account === 'SYSTEM'`: SYSTEM→Agent (funding, no commission/limits) vs. Agent→Customer (commission charged to agent, customer balance capped at `maxTxnAmount`). Read the large header comment in that file before touching it — the flow-selection logic is easy to break.

**Email:** `controllers/users/user.controller.js`'s local `mailer()` picks between `services/gmailPersonalHelper.js` (SMTP via `EMAIL_*` env vars) and `services/emailHelper.js` (Google service account) based solely on whether `config/gmail-service-account.json` exists on disk — there's no explicit env flag for this switch.

**Seeded/system accounts** (see `sequelizeModel/Users.js` and `endpoints.md` for full table): `SYSTEM` (phone `SYSTEM`), `admin@dmoney.com` (phone `01686606909`), plus one Agent/two Customers/one Merchant, all password `1234`. System accounts (`SYSTEM`, `admin@dmoney.com`, `system@dmoney.com`, `admin@roadtocareer.net`) are protected from update/delete in `user.controller.js`.

## Known issues / security posture

`qa-findings/04-security-vulnerabilities.md` documents eleven confirmed issues (default JWT secret, OTP dev-bypass, `publicAuthenticateJWT` misuse, password hashes returned in API responses, unsalted SHA-256 passwords, open CORS, path traversal on `/user/uploads/:file`, IDOR on statement/balance/limit endpoints, Stripe confirm trusting client metadata, no rate limiting, minimal JWT claims) with full repro steps and fix suggestions. `qa-findings/01-*` through `03-*` cover auth and deposit-flow bugs/test cases. Treat these files as the current ground truth for "what's already known" before reporting something as a new finding, and check with the user before applying any of the listed fixes outside of an explicit fix task.
