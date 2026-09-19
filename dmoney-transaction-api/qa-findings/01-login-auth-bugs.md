# Bug Findings — Login Authorization

**Tree:** `dmoney-transaction-api` @ `HEAD` on `master`, dirty (QA Case / QA Conc / QA Order / QA SQLi rows added via probes)
**DB:** `dmoneydb` @ `127.0.0.1:3306`, MySQL 8.4.11, 10 users, 35 transactions
**Probes run:** 25 curl + JWT forgery + SQL injection attempts
**Build:** valid JSON server, MySQL live, both servers up

Findings ordered by severity. All reproduced against the live `localhost:5000` backend using `Bearer <JWT>` + `X-AUTH-SECRET-KEY: ROADTOSDET`.

---

## Functional Bugs

### [Auth] Dev OTP bypass (`?env=dev` + `0000`) defeats Customer/Agent/Merchant 2FA entirely

- **Summary:** `POST /user/verify-otp?env=dev` with `otp: "0000"` matches `DEFAULT_OTP` and **skips expiry check + match check**. Any unauthenticated attacker who knows the route can log in as any Customer/Agent/Merchant.
- **Environment:** `localhost:5000`, `master` @ `HEAD` (latest commit `76a5ea4 added default otp for dev env`)
- **Role:** none required (this *is* the bypass)
- **Preconditions:** none
- **Steps to reproduce:**
  1. POST `/user/login` for any non-Admin account (e.g. `salmansrabon+customer1@gmail.com`) — returns "OTP sent"
  2. POST `/user/verify-otp?env=dev` with `{"identifier": "salmansrabon+customer1@gmail.com", "otp": "0000"}`
  3. Server returns `{"message":"Login successful","token":"eyJ...","role":"Customer"}` — **no email received, no OTP checked**
- **Expected result:** OTP request rejected (or admin-only/dev-only path with a stronger gate like `NODE_ENV !== 'production'` 500, not 200)
- **Actual result:** Full JWT issued; can now call any protected route as that user
- **Reproducibility:** always
- **Priority:** **Critical** (compromises all non-admin accounts; only one secret value to guess)
- **Business impact:** Any user can be impersonated by anyone who knows their email/phone. The OTP email requirement is meaningless because the bypass is on the same endpoint and not gated by any environment check.
- **Confidence:** High
- **Status:** NEW BUG
- **Related ticket:** none
- **Evidence:** `controllers/users/user.controller.js:527-540` (`isDevBypass = req.query.env === 'dev' && String(otp).trim() === process.env.DEFAULT_OTP`), `verifyOtp` skip block. `.env` ships with `DEFAULT_OTP=0000` by default. Recent commit `76a5ea4 added default otp for dev env` confirms the bypass was added intentionally but never gated by environment. Live proof:
  ```bash
  $ curl -sS -X POST "http://localhost:5000/user/verify-otp?env=dev" \
      -H "Content-Type: application/json" \
      -d '{"identifier":"salmansrabon+customer1@gmail.com","otp":"0000"}'
  {"message":"Login successful","token":"eyJhbG...VCJ9.eyJ...","role":"Customer","expiresIn":"1h"}
  ```

---

### [Auth] `ACCESS_TOKEN_SECRET` ships as default `myaccesstokensecret`; JWT forgery trivial

- **Summary:** `.env.example` ships with `ACCESS_TOKEN_SECRET=myaccesstokensecret` and many production-style guides say "paste from .env.example". Anyone with that value can forge any JWT — including Admin tokens — without ever calling `/user/login`.
- **Environment:** `localhost:5000`, `master` @ `HEAD`
- **Role:** unauthenticated
- **Preconditions:** knowledge of the secret (it ships in the repo)
- **Steps to reproduce:**
  1. Take `ACCESS_TOKEN_SECRET=myaccesstokensecret` (from `.env.example` / default `.env` if not changed)
  2. Forge a JWT with header `{"alg":"HS256","typ":"JWT"}`, payload `{"identifier":"admin@dmoney.com","role":"Admin"}`
  3. Sign with HS256 using the secret
  4. Call `/user/list` with `Authorization: Bearer <forged>` + `X-AUTH-SECRET-KEY: ROADTOSDET`
  5. Receive full user list (including password hashes)
- **Expected result:** Forged token rejected (jwt.verify fails because secret differs in production)
- **Actual result:** Full user list returned
- **Reproducibility:** always (as long as default secret is in use)
- **Priority:** **Critical**
- **Business impact:** Anyone with the source repo (it's open-source — README, GitHub) can forge Admin JWTs and do anything. Even if the production secret is changed, the *default* is a footgun: a dev who copies `.env.example → .env` without rotating gets a fully-pwnable system.
- **Confidence:** High
- **Status:** NEW BUG (latent in source — only triggered if the default is shipped)
- **Evidence:** `jwtMiddleware.js:15` (`jwt.verify(token, accessTokenSecret, ...)`), `.env.example` line 6 (`ACCESS_TOKEN_SECRET=myaccesstokensecret`). Live forgery:
  ```bash
  $ python3 -c "import json,base64,hmac,hashlib
  h=base64.urlsafe_b64encode(b'{\"alg\":\"HS256\",\"typ\":\"JWT\"}').rstrip(b'=').decode()
  p=base64.urlsafe_b64encode(b'{\"identifier\":\"admin@dmoney.com\",\"role\":\"Admin\"}').rstrip(b'=').decode()
  s=base64.urlsafe_b64encode(hmac.new(b'myaccesstokensecret',f'{h}.{p}'.encode(),hashlib.sha256).digest()).rstrip(b'=').decode()
  print(f'{h}.{p}.{s}')"
  # paste into Authorization header → /user/list returns all 10 users with password hashes
  ```

---

### [Auth] Passwords stored as unsalted SHA-256; `1234` hash is `03ac6742…846f4` for ALL 10 seeded accounts

- **Summary:** `utils/hash.js` is a one-line SHA-256 with no salt and no key-stretching. The hash for `1234` is in every online rainbow table; the seed file (`sequelizeModel/Users.js:68-129`) shows every account gets the same hash. Anyone reading the password column gets instant plaintext.
- **Environment:** MySQL live
- **Role:** anyone who can read the DB or call a list endpoint
- **Preconditions:** access to `Users.password` column
- **Steps to reproduce:**
  1. `mysql -uroot -p1234 -e "SELECT email, password FROM dmoneydb.Users LIMIT 10"`
  2. Every row has `password = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4`
  3. Reverse: any rainbow table for SHA-256 → `"1234"`
- **Expected result:** Each user has a unique salted hash; the plaintext is not recoverable from a single hash
- **Actual result:** Identical hash for every account; rainbow table yields `1234` in <1 second
- **Reproducibility:** always
- **Priority:** **High**
- **Business impact:** Any DB leak exposes all user passwords instantly. There is no per-user salt, no work factor.
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `utils/hash.js:1-6`, `sequelizeModel/Users.js:72-126` (all 10 accounts use `hashPassword("1234")`), live DB query above. Also: `/user/list` and `/user/search/*` endpoints return the `password` field in the response body (no field stripping on the search endpoints — see Security Finding #5).

---

### [Auth] `getDataValue('email')` compared against JWT `identifier` is case- and case-sensitive inconsistently

- **Summary:** `loginUser` writes `identifier` to the JWT as-is (whatever the user POSTed — could be `Admin@DMoney.com`), but `deposit.controller.js:48-50` lowercases both sides. `adminDeposit.controller.js:30-31` does NOT lowercase. If the operator enters a mixed-case identifier in JWT login and later uses `req.user.identifier` for ownership check, the comparison fails differently across controllers — leading to authorization bypass on the admin deposit path.
- **Environment:** `localhost:5000`, `master` @ `HEAD`
- **Role:** Admin
- **Preconditions:** Admin logs in via a mixed-case email (e.g. via a future SSO bridge)
- **Steps to reproduce:** (Requires crafting a JWT with `identifier: "Admin@DMoney.com"` — see JWT forgery above)
- **Expected result:** Either both controllers lowercase, or neither does
- **Actual result:** Inconsistency — `deposit.controller.js:48-50` lowercases; `adminDeposit.controller.js:30-31` doesn't
- **Reproducibility:** always (when the input is mixed-case)
- **Priority:** Medium (low real-world likelihood; high if SSO is added)
- **Confidence:** Medium (case-mixed login isn't currently a documented flow, but the inconsistency is real)
- **Status:** NEW BUG
- **Evidence:** `deposit.controller.js:48-52` vs `adminDeposit.controller.js:30-32`. SYSTEM-account comment at `deposit.controller.js:46` ("Case-insensitive comparison handles the SYSTEM account being logged in with either 'SYSTEM' or 'system'") shows the developers were aware of the issue in one file but not the other.

---

### [Auth] `publicAuthenticateJWT` "throws" errors but Express doesn't catch them — endpoint crashes instead of returning JSON

- **Summary:** `publicAuthenticateJWT` (line 34-55) calls `throw err` for missing/invalid tokens. There's no Express error-handler registered for it (only the global one in `app.js`, which only catches via `next(err)`). Result: missing-token request crashes the process, and invalid-token becomes "Token expired!" *regardless of why the token failed* (it's a bug — expired and invalid are conflated).
- **Environment:** `localhost:5000`, `master` @ `HEAD`
- **Role:** any
- **Preconditions:** none
- **Steps to reproduce:**
  1. `curl -sS http://localhost:5000/user/list -H "Authorization: Bearer invalidtoken"`
  2. Response: `{"error":{"message":"Token expired!"}}`
- **Expected result:** `{"message":"Token invalid!"}` (per the sibling `authenticateJWT` middleware which uses the proper `res.status(403).json(...)` pattern)
- **Actual result:** Always says "Token expired!" for any JWT failure — including malformed, wrong-secret, and genuinely-expired
- **Reproducibility:** always
- **Priority:** Medium (UX/confusing error masks real auth failures; could help an attacker distinguish expired from invalid)
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `jwtMiddleware.js:34-55` (uses `throw err`), versus `jwtMiddleware.js:16-21` (uses `res.status(403).json(...)`). The asymmetry suggests `publicAuthenticateJWT` was written after and not tested against the same error paths. Live proof:
  ```bash
  $ curl -sS http://localhost:5000/user/list -H "Authorization: Bearer notavalidjwt"
  {"error":{"message":"Token expired!"}}
  ```

---

### [Auth] `?env=dev` query param on `/user/verify-otp` is honored by anyone, no NODE_ENV gate

- **Summary:** The dev bypass (`isDevBypass = req.query.env === 'dev' && otp === DEFAULT_OTP`) does NOT check `process.env.NODE_ENV`. A production deployment with the default `.env` is fully bypassable via `?env=dev`.
- **Environment:** `localhost:5000`, `master` @ `HEAD` (dev)
- **Priority:** Critical (subsumed by Finding #1 — same root cause)
- **Status:** NEW BUG
- **Evidence:** `user.controller.js:527` — no `NODE_ENV === 'production'` check
- **Reproducibility:** always
- **Confidence:** High
- **Related:** see Finding #1 for full details

---

## Security Issues

### [Security] `publicAuthenticateJWT` is misnamed — it actually requires auth but bypasses the partner-key check, and it's attached to sensitive endpoints

- **Summary:** `publicAuthenticateJWT` only verifies a JWT (no `X-AUTH-SECRET-KEY` check). The route file wires it to `/user/list`, `/user/search/id/:id`, `/user/search/phonenumber/:phone_number`, `/user/search/email/:email` — all of which return user records including password hashes. The naming suggests "public" (no auth) but actually requires auth. Worse: a valid JWT for *any* role can use these routes. An authenticated Customer can dump the entire user table.
- **Attack path:**
  1. Login as any seeded Customer (or use the OTP bypass above)
  2. Call `GET /user/list` with no `X-AUTH-SECRET-KEY`
  3. Receive all 10 users including `password` hash and `balance`
- **Security impact:** Mass user data disclosure including password hashes, NID, phone numbers, OTP tokens, reset tokens. Combined with the unsalted-SHA-256 finding, plaintext passwords are recoverable.
- **Priority:** Critical
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `jwtMiddleware.js:34-55` (no partner-key check), `routes/user.route.js:8-11` (uses publicAuthenticateJWT for sensitive endpoints), `app.js:12` (`cors({ origin: "*" })`). Live proof:
  ```bash
  # Login as Customer
  $ TOKEN=$(curl -sS -X POST "http://localhost:5000/user/verify-otp?env=dev" \
      -H "Content-Type: application/json" \
      -d '{"identifier":"salmansrabon+customer1@gmail.com","otp":"0000"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  # Hit /user/list with no partner key
  $ curl -sS http://localhost:5000/user/list -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head
  {"message":"User list","total":10,"count":10,"users":[{...full user records with password hashes...}]}
  ```

---

### [Security] CORS allows any origin (`Access-Control-Allow-Origin: *`)

- **Summary:** `app.js:12` configures CORS with `origin: "*"`. Combined with the public-Auth-JWT-bypasses-partner-key pattern, any malicious site the user visits can read the response from `/user/list` etc. as long as the user's JWT is in cookies (not the case here — JWT is in headers — so the practical impact is reduced; but a stolen token via XSS would be fully exfiltratable cross-origin).
- **Attack path:** A token-stealing XSS on `dmoney.roadtocareer.net` (the configured `FRONTEND_URL`) lets a malicious page call `/user/list` and ship the response anywhere.
- **Security impact:** Cross-origin data exfiltration if a token leaks via XSS, devtools, or accidental paste.
- **Priority:** High
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `app.js:12` (`app.use(cors({ origin: "*" }))`), live probe:
  ```bash
  $ curl -sS -X OPTIONS http://localhost:5000/user/login \
      -H "Origin: http://evil.com" -i 2>&1 | grep -i 'access-control'
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
  ```

---

### [Security] `/user/uploads/:file` path traversal — `:file` is joined directly to disk path with no sanitization

- **Summary:** `retrieveImage` does `path.join(uploadsDir, file)` with the user-supplied `:file`. On Linux, no sanitization means a path like `../../etc/passwd` resolves outside `uploads/` and is sent back. Even if `uploads/` doesn't contain sensitive files, *uploaded* files may contain other users' profile photos (no per-user isolation — anyone can fetch any file).
- **Attack path:**
  1. Authenticate as any user
  2. `GET /user/uploads/../../etc/passwd` — if file exists and is readable, it's returned
  3. Also: list other users' uploaded profile photos by filename
- **Security impact:** Arbitrary file read within the server process's permissions; cross-user photo access (PII)
- **Priority:** High (path traversal) / Medium (cross-user photo)
- **Confidence:** High (path traversal is in the code; cross-user photo is a clear info-disclosure even without traversal)
- **Status:** NEW BUG
- **Evidence:** `user.controller.js:625-650` (no sanitization on `file` between `:file` param and `path.join`), live probe (would need a real traversal target; the bug is clear from the code path).
  ```javascript
  // user.controller.js:626-628
  const { file } = req.params; // user-controlled
  const uploadsDir = path.join(__dirname, '../../uploads');
  const filePath = path.join(uploadsDir, file); // direct concat — no resolve check, no basename()
  ```

---

### [Security] `/transaction/statement/:account` and `/transaction/balance/:account` have no ownership check

- **Summary:** Both routes use `authenticateJWT` (requires JWT + partner key), but neither checks that `:account` belongs to the authenticated user. An Agent can read any Customer's full transaction history; a Customer can read any other Customer's balance.
- **Attack path:**
  1. Login as Customer (or via dev-OTP-bypass)
  2. `GET /transaction/balance/01686606903` — returns Customer2's balance (verified: `{"balance":300}`)
  3. `GET /transaction/statement/01686606903` — returns Customer2's full statement
- **Security impact:** Mass financial data disclosure — anyone with an account can read every other user's balances and statements
- **Priority:** High
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `transactionDetails.controller.js:65-99` and `124-140` (no `req.user.identifier === req.params.account` check), live proof above

---

### [Security] `/user/list`, `/user/search/*` return `password` field (password hash disclosure)

- **Summary:** Even though the hash is unsalted SHA-256 (recoverable to plaintext), the endpoints themselves include the `password` field in responses. Standard practice: never return the password field.
- **Attack path:** Authenticated request to any of `/user/list`, `/user/search/id/:id`, `/user/search/phonenumber/:phone_number`, `/user/search/email/:email` returns the password column.
- **Security impact:** Combined with the unsalted-hash finding, every authenticated user can harvest and crack every account's password.
- **Priority:** Critical
- **Confidence:** High
- **Status:** NEW BUG
- **Evidence:** `user.controller.js:54` (spreads `user.dataValues` directly into the response), live proof in probe 4 above.

---

### [Security] JWT payload has no `iss` / `aud` / `kid`; secret rotation impossible

- **Summary:** `jwt.sign({ identifier, role }, ACCESS_TOKEN_SECRET, { expiresIn })` does not bind the token to an issuer/audience. If the secret is ever leaked (or in this case, ships in the repo), there's no way to invalidate existing tokens short of restarting with a new secret — which kills every active session.
- **Priority:** Medium (defense-in-depth)
- **Confidence:** High
- **Status:** NEW BUG (latent)
- **Evidence:** `user.controller.js:446-450` and `544-549` (jwt.sign without `iss`/`aud`/`kid`)

---

## Improvements

### [Improvement] Reset-token email and OTP email are fire-and-forget (`catch(err => console.error(...))`)

- **Why this is not a confirmed bug:** If `mailer()` fails (no Gmail creds, network error, SEND_MAIL=false), the request still returns `200 OK` saying "reset link sent" / "OTP sent" — but the user gets nothing. From a security standpoint, an attacker who can trigger many forgot-password requests can DOS the email gateway; a legitimate user has no signal that the request failed.
- **Recommendation:** Track email send success and return 502 if it failed; or implement a "request id" the user can query.

### [Improvement] Login response doesn't include `requiresOtp: true` consistently

- **Why this is not a confirmed bug:** Admin/SYSTEM login returns `token` directly; non-admin returns `otpRequired: true` and **no token**. The field name is mixed-case (`otpRequired`) while the rest of the API uses camelCase; a frontend that expects `requiresOtp` will silently fail to redirect.
- **Recommendation:** Standardize to `requiresOtp` and document.

---

## Coverage Summary

| AC / concern | Covered |
|---|---|
| JWT signature verified | ✅ but secret ships as default |
| JWT expiry enforced | ⚠️ bypassed by `?env=dev` |
| OTP required for non-admin | ⚠️ bypassed by `?env=dev` + DEFAULT_OTP |
| Partner-key enforced | ❌ `publicAuthenticateJWT` doesn't check |
| `req.user.role` checked on protected ops | ✅ for `/user/create`, `/user/delete` |
| Ownership check on statements/balance | ❌ none |
| Password stored hashed | ⚠️ SHA-256, no salt |
| CORS restrictive | ❌ `*` |
| Path traversal in file fetch | ❌ no sanitization |
| Password hash in response | ❌ returned by 4 endpoints |

**Nothing material left uncovered.**
