# dmoney-transaction-api — core

Full guide: `dmoney-transaction-api/CLAUDE.md`. Known bugs/security: `qa-findings/01..04-*.md` (ground truth for "already known").

## Layout / flow
`server.js` → `app.js` (CORS, morgan, body-parser, Swagger at `/api-docs/user` + `/api-docs/transaction`, 404 + error handler) → `routes/*.route.js` (mounted at `/`, no `/api` prefix) → `controllers/{users,transactions}/*.controller.js` → `sequelizeModel/*` + `services/*`.

## Invariants
- Auth middlewares in `jwtMiddleware.js`: `authenticateJWT` = JWT + `X-AUTH-SECRET-KEY` (== `PARTNER_KEY`); `publicAuthenticateJWT` = JWT only (still authenticated, no partner key).
- Login two-step: `POST /user/login` → 4-digit OTP (2 min, logged to console) → `POST /user/verify-otp` → JWT. Admin/SYSTEM skip OTP. `?env=dev` + `DEFAULT_OTP` bypass is intentional.
- No balance column. `Transactions` = append-only double-entry ledger; balance = `SUM(credit) - SUM(debit)` per `account` (phone_number or literal `"SYSTEM"`).
- Money-moving controllers: `sequelize.transaction` (READ_COMMITTED) + `SELECT ... FOR UPDATE` with `replacements`. Follow this for new endpoints; `services/getBalance.js` uses string-concat SQL (known weakness, don't copy).
- Fees from `Commissions` via `Commission.getConfig(type)`/`calcFee` with hardcoded fallbacks in controllers; customer caps via `services/limitChecker.js` (`TransactionLimits`). `GET /transaction/limit/:account` is hardcoded 10000 (known gap).
- Deposit has two flows keyed on `from_account === 'SYSTEM'`; read header comment in `deposit.controller.js` before editing.
- Models call `sequelize.sync()` on load and seed accounts (all password `1234`); system accounts protected from update/delete.
- Env: `sequelizeModel/db.js` uses `custom-env` → reads **`.env.dev`**; everything else uses dotenv → **`.env`**. Need both locally.
- Migrations = standalone idempotent node scripts in `migrations/` (+ `add_role_index.js`), not a framework.
- Email transport chosen by existence of `config/gmail-service-account.json`.
