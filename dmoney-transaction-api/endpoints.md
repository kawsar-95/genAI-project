# Endpoint Catalog — dMoney Backend

All endpoints on the running backend at `http://localhost:5000`.

**Tree built from:** `app.js`, `routes/user.route.js`, `routes/transaction.route.js`, `routes/default.route.js` on the working tree of `dmoney-transaction-api`.

**Auth headers convention:**
- `Authorization: Bearer <JWT>` — required on all protected routes
- `X-AUTH-SECRET-KEY: ROADTOSDET` — required by `authenticateJWT` middleware
- Routes using `publicAuthenticateJWT` accept any valid JWT (the partner-key check is bypassed — see security findings)

---

## Default / Health

### `GET /` — Server status
```bash
curl -sS http://localhost:5000/
```

---

## User Management (`/user/...`)

### `POST /user/register` — Self-registration (no auth)
Role must be Customer / Agent / Merchant. Email must be `@gmail.com`. Account created with `status: pending`.

```bash
curl -sS -X POST http://localhost:5000/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "newuser@gmail.com",
    "password": "Test1234!",
    "phone_number": "01712345678",
    "nid": "1234567890123",
    "role": "Customer"
  }'
```

### `POST /user/login` — Step 1 (identifier + password)
Admin and SYSTEM accounts return JWT immediately. Customer/Agent/Merchant get OTP.

```bash
curl -sS -X POST http://localhost:5000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dmoney.com",
    "password": "1234"
  }'
```

### `POST /user/verify-otp` — Step 2 (identifier + OTP)
⚠️ **Dev bypass:** `?env=dev` query param with `otp=0000` (DEFAULT_OTP) skips expiry + match checks. See security findings.

```bash
# Normal OTP verify
curl -sS -X POST http://localhost:5000/user/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "salmansrabon+customer1@gmail.com",
    "otp": "1234"
  }'

# Dev bypass (DO NOT use in production)
curl -sS -X POST "http://localhost:5000/user/verify-otp?env=dev" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "salmansrabon+customer1@gmail.com",
    "otp": "0000"
  }'
```

### `POST /user/forgot-password` — Request password reset
Email must be `@gmail.com`. Reset token logged to console + emailed.

```bash
curl -sS -X POST http://localhost:5000/user/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "salmansrabon+customer1@gmail.com"}'
```

### `POST /user/reset-password` — Apply new password using reset token
```bash
curl -sS -X POST http://localhost:5000/user/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<64-char-hex-token-from-console-or-email>",
    "password": "NewPass123!",
    "confirmPassword": "NewPass123!"
  }'
```

### `GET /user/list` — Paginated user list with balances
Uses `publicAuthenticateJWT` (partner-key check bypassed).

```bash
curl -sS "http://localhost:5000/user/list?page=1&count=10&order=asc" \
  -H "Authorization: Bearer <JWT>"
```

### `GET /user/search/:role` — Users by role
Uses `authenticateJWT` (requires partner key).

```bash
curl -sS "http://localhost:5000/user/search/Customer?page=1&limit=20" \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `GET /user/search/id/:id` — User by numeric id (with balance)
```bash
curl -sS "http://localhost:5000/user/search/id/4" \
  -H "Authorization: Bearer <JWT>"
```

### `GET /user/search/phonenumber/:phone_number` — User by phone
```bash
curl -sS "http://localhost:5000/user/search/phonenumber/01686606902" \
  -H "Authorization: Bearer <JWT>"
```

### `GET /user/search/email/:email` — User by email
```bash
curl -sS "http://localhost:5000/user/search/email/salmansrabon+customer1@gmail.com" \
  -H "Authorization: Bearer <JWT>"
```

### `POST /user/create` — Create user (Admin only)
```bash
curl -sS -X POST http://localhost:5000/user/create \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New User",
    "email": "newuser@gmail.com",
    "password": "Test1234!",
    "phone_number": "01712345678",
    "nid": "1234567890123",
    "role": "Customer"
  }'
```

### `PUT /user/update/:id` — Full update
Non-admin can only update self. System users (SYSTEM, admin@dmoney.com, system@dmoney.com, admin@roadtocareer.net) are protected.

```bash
curl -sS -X PUT http://localhost:5000/user/update/4 \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@gmail.com",
    "password": "NewPass123!",
    "phone_number": "01686606902",
    "nid": "123456789",
    "role": "Customer"
  }'
```

### `PATCH /user/update/:id` — Partial update (status change emails)
```bash
curl -sS -X PATCH http://localhost:5000/user/update/4 \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

### `DELETE /user/delete/:id` — Delete user (Admin only)
System users are protected.

```bash
curl -sS -X DELETE http://localhost:5000/user/delete/4 \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `POST /user/upload/:id` — Upload profile photo
Multipart with field name `image`, max 1MB, image/* mimetypes only.

```bash
curl -sS -X POST http://localhost:5000/user/upload/4 \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -F "image=@/path/to/photo.jpg"
```

### `GET /user/uploads/:file` — Retrieve profile photo (path traversal risk)
⚠️ See security findings — no path sanitization.

```bash
curl -sS "http://localhost:5000/user/uploads/photo.jpg" \
  -H "Authorization: Bearer <JWT>"
```

---

## Transactions (`/transaction/...`)

### `GET /transaction/list` — Paginated all transactions
```bash
curl -sS "http://localhost:5000/transaction/list?page=1&count=20" \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `GET /transaction/search/:trnxId` — Transactions by transaction ID
```bash
curl -sS "http://localhost:5000/transaction/search/TRNX1001" \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `GET /transaction/statement/:account` — Statement by account (phone_number)
⚠️ **No ownership check** — any authenticated user can read any account's statement.

```bash
curl -sS "http://localhost:5000/transaction/statement/01686606902?page=1&count=20" \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `GET /transaction/limit/:account` — Remaining daily limit
⚠️ Hardcoded to `10000`, ignores `TransactionLimits` table.

```bash
curl -sS "http://localhost:5000/transaction/limit/01686606902" \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `GET /transaction/balance/:account` — Current balance
⚠️ **No ownership check.**

```bash
curl -sS "http://localhost:5000/transaction/balance/01686606902" \
  -H "Authorization: Bearer <JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET"
```

### `POST /transaction/deposit` — Agent→Customer or SYSTEM→Agent deposit
Two flows:
- **Flow 1 (SYSTEM→Agent):** `from_account=SYSTEM`, `to_account=<agent phone>`. No commission, no min/max.
- **Flow 2 (Agent→Customer):** `from_account=<agent phone>`, `to_account=<customer phone>`. Min 10, max 10000. 2.5% commission.

```bash
# Flow 1: SYSTEM → Agent
curl -sS -X POST http://localhost:5000/transaction/deposit \
  -H "Authorization: Bearer <ADMIN_JWT_OR_SYSTEM_LOGIN>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "SYSTEM",
    "to_account": "01686606901",
    "amount": 5000
  }'

# Flow 2: Agent → Customer
curl -sS -X POST http://localhost:5000/transaction/deposit \
  -H "Authorization: Bearer <AGENT_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "01686606901",
    "to_account": "01686606902",
    "amount": 500
  }'
```

### `POST /transaction/adminDeposit` — Admin → SYSTEM
```bash
curl -sS -X POST http://localhost:5000/transaction/adminDeposit \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "01686606909",
    "to_account": "SYSTEM",
    "amount": 100000
  }'
```

### `POST /transaction/withdraw` — Customer withdraw
```bash
curl -sS -X POST http://localhost:5000/transaction/withdraw \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "01686606902",
    "amount": 200
  }'
```

### `POST /transaction/sendmoney` — Customer→Customer P2P
```bash
curl -sS -X POST http://localhost:5000/transaction/sendmoney \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "01686606902",
    "to_account": "01686606903",
    "amount": 100
  }'
```

### `POST /transaction/payment` — Customer→Merchant payment
```bash
curl -sS -X POST http://localhost:5000/transaction/payment \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "01686606902",
    "to_account": "01686606905",
    "amount": 500
  }'
```

### `POST /transaction/stripe/create-intent` — Create Stripe PaymentIntent (Customer only)
```bash
curl -sS -X POST http://localhost:5000/transaction/stripe/create-intent \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

### `POST /transaction/stripe/confirm` — Confirm cash-in after Stripe payment
```bash
curl -sS -X POST http://localhost:5000/transaction/stripe/confirm \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -H "X-AUTH-SECRET-KEY: ROADTOSDET" \
  -H "Content-Type: application/json" \
  -d '{"paymentIntentId": "pi_3XXXXXX_secret_YYYY"}'
```

---

## Swagger / API Docs

### `GET /api-docs/user` — User endpoints Swagger UI
```bash
curl -sS http://localhost:5000/api-docs/user/
```

### `GET /api-docs/transaction` — Transaction endpoints Swagger UI
```bash
curl -sS http://localhost:5000/api-docs/transaction/
```

---

## Summary

| Group | Endpoints | Auth required | Auth mechanism |
|---|---|---|---|
| Default | 1 | No | — |
| User | 15 | Mixed | `publicAuthenticateJWT` or `authenticateJWT` |
| Transaction | 13 | Yes (most) | `authenticateJWT` |
| Swagger | 2 | No | — |
| **Total** | **31** | | |

**Default seeded credentials** (all use password `1234`):

| Role | Email | Phone |
|---|---|---|
| System | system@dmoney.com | SYSTEM |
| Admin | admin@dmoney.com | 01686606909 |
| Agent | salmansrabon+agent@gmail.com | 01686606901 |
| Customer | salmansrabon+customer1@gmail.com | 01686606902 |
| Customer | salmansrabon+customer2@gmail.com | 01686606903 |
| Merchant | salmansrabon+merchant@gmail.com | 01686606905 |
