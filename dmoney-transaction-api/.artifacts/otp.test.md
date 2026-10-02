# Test Cases — OTP Login (Two-Step Authentication)

**Ticket:** none (no Jira ID)
**Scope:** The current OTP login flow, treated as the change under test. There is no OTP diff against `main` (`3bcaa33` is the merge-base and `HEAD`, with nothing uncommitted).
**Coverage target:** `POST /user/login`, `POST /user/verify-otp`, the `/login` page in `dmoney-web-react`, and the OTP columns on `Users`
**Sources:** `controllers/users/user.controller.js`, `routes/user.route.js`, `sequelizeModel/Users.js`, `migrations/add_otp_to_users.js`, `dmoney-web-react/src/app/login/page.tsx`, BRD §5.1 (`dmoney-web-react/README.md`), `qa-findings/01-login-auth-bugs.md`, `qa-findings/04-security-vulnerabilities.md`

---

## 1. Blast Radius

Overall risk: **Critical**. This is the authentication entry point, and every JWT-protected route depends on it.

### Code under test
| File | Category | Symbols |
|---|---|---|
| `controllers/users/user.controller.js:418` | Controller | `loginUser` (OTP generation, Admin/SYSTEM skip, email) |
| `controllers/users/user.controller.js:498` | Controller | `verifyOtp` (expiry, match, dev bypass, JWT issue) |
| `controllers/users/user.controller.js:564` | Controller | `validateLoginData` (reads `email` \|\| `phone_number`) |
| `routes/user.route.js:18-19` | Route | `/user/login`, `/user/verify-otp`, no auth middleware |
| `sequelizeModel/Users.js:36-45` | Model | `otp` STRING(4), `otp_expire` DATE |
| `migrations/add_otp_to_users.js` | Migration | adds `otp`, `otp_expire` |

### Impact chains
- `validateLoginData` → `loginUser` → `POST /user/login` → `web/src/app/login/page.tsx:116`
- `verifyOtp` → `POST /user/verify-otp` → `web/src/app/login/page.tsx:152-158` (passes the page's `?env=` query through)
- `loginUser` → `mailer()` (`user.controller.js:21`) → `services/emailHelper.js` or `services/gmailPersonalHelper.js`, depending on whether `config/gmail-service-account.json` exists
- `verifyOtp` JWT → `completeLogin` → `GET /user/search/email|phonenumber` (`page.tsx:77,82`) → `localStorage` + `token` cookie → `web/src/middleware.ts` and `web/src/lib/api.ts` → **every authenticated page and endpoint**

### Affected endpoints
| Endpoint | Auth | Risk | Why |
|---|---|---|---|
| POST /user/login | none | Critical | Issues the OTP, or a JWT directly for Admin/SYSTEM |
| POST /user/verify-otp | none | Critical | Issues the JWT for Customer/Agent/Merchant |
| All `authenticateJWT` / `publicAuthenticateJWT` routes | JWT | High | They consume the token minted here |

### Known issues that overlap (current behaviour, not new findings)
- **S-2 / 01 #1:** dev bypass `?env=dev` + `DEFAULT_OTP` (`0000`) skips the expiry and match checks (`user.controller.js:527`).
- **S-10:** no rate limiting on any route. That includes OTP brute force.
- **S-11:** JWT payload is only `{identifier, role}`. There is no `iss`/`aud`/`jti`.
- **01 #4:** the JWT `identifier` keeps the case the user typed. Controllers compare it inconsistently.
- **01 Improvement:** OTP email is fire-and-forget, so the API returns 200 even when sending fails.

---

## 2. Acceptance Criteria (from BRD §5.1)

| ID | Criterion |
|---|---|
| AC-1 | Customer, Agent and Merchant get `otpRequired: true` and no token from `/user/login`. |
| AC-2 | Admin and the SYSTEM account get a JWT directly from `/user/login`, and no OTP is generated. |
| AC-3 | The OTP is 4 digits and valid for 2 minutes. |
| AC-4 | The OTP is emailed only to `@gmail.com` addresses and is always logged to the server console. |
| AC-5 | A valid, unexpired, matching OTP returns a JWT and clears the OTP (one-time use). |
| AC-6 | An invalid OTP returns 401. |
| AC-7 | An expired OTP returns 401 and clears the OTP fields. |
| AC-8 | The frontend switches to a 4-digit OTP step, shows errors, and lets the user go back to the credentials step. |

---

## 3. Test Data & Setup

- Backend `http://localhost:5000`, frontend `http://localhost:3000`, MySQL `dmoneydb` seeded.
- Seeded accounts (password `1234`):

| Role | Email | Phone |
|---|---|---|
| Admin | `admin@dmoney.com` | `01686606909` |
| SYSTEM (role `Agent`) | `system@dmoney.com` | `SYSTEM` |
| Agent | `salmansrabon+agent@gmail.com` | `01686606901` |
| Customer 1 | `salmansrabon+customer1@gmail.com` | `01686606902` |
| Customer 2 | `salmansrabon+customer2@gmail.com` | `01686606903` |
| Merchant | `salmansrabon+merchant@gmail.com` | `01686606905` |

- **Reading the OTP:** check the server console (`🔐 OTP for <email> [<role>]: <otp>`), or run `SELECT otp, otp_expire FROM Users WHERE email='<email>';`.
- **Forcing expiry without waiting:** `UPDATE Users SET otp_expire = NOW() - INTERVAL 1 MINUTE WHERE email='<email>';`. Check that the DB timezone matches the server before trusting this.
- **Non-Gmail user:** create one as Admin with `POST /user/create` (for example `qa.otp@example.com`). Set `status` to `active`.
- **Base request:**
  ```bash
  curl -sS -X POST http://localhost:5000/user/login -H "Content-Type: application/json" \
    -d '{"email":"salmansrabon+customer1@gmail.com","password":"1234"}'
  curl -sS -X POST http://localhost:5000/user/verify-otp -H "Content-Type: application/json" \
    -d '{"identifier":"salmansrabon+customer1@gmail.com","otp":"<otp>"}'
  ```

Priority: **P1** = must pass before release · **P2** = important · **P3** = edge or low impact.

---

## 4. API — Step 1: `POST /user/login`

| ID | Title | Pri | Preconditions | Steps | Expected | AC |
|---|---|---|---|---|---|---|
| TC-01 | Customer login with email triggers OTP | P1 | Customer 1 exists | POST `/user/login` `{"email":"salmansrabon+customer1@gmail.com","password":"1234"}` | 200 `{"message":"OTP sent to your registered email address","otpRequired":true}` with no `token` key. DB: `otp` is 4 digits in 1000–9999 and `otp_expire` ≈ now + 2 min | AC-1, AC-3 |
| TC-02 | Login with phone number triggers OTP | P1 | — | POST `{"phone_number":"01686606902","password":"1234"}` | Same result as TC-01 | AC-1 |
| TC-03 | Agent and Merchant also require OTP | P1 | — | Repeat TC-01 for Agent and for Merchant | Both return `otpRequired: true` with no token | AC-1 |
| TC-04 | Admin skips OTP | P1 | — | POST `{"email":"admin@dmoney.com","password":"1234"}` | 200 `{"message":"Login successful","token":"…","role":"Admin","expiresIn":"<expires_in>"}`. Admin's `otp`/`otp_expire` stay NULL | AC-2 |
| TC-05 | SYSTEM account skips OTP even though its role is Agent | P1 | — | POST `{"phone_number":"SYSTEM","password":"1234"}`, then repeat with `"system"` (lowercase) | Both return 200 with a token. The skip is keyed on phone `SYSTEM`, case-insensitive (`user.controller.js:442`), not on role | AC-2 |
| TC-06 | Wrong password generates no OTP | P1 | Customer 1 has no pending OTP (or note its current value) | POST with `"password":"9999"` | 401 `{"message":"Password incorrect"}`. DB `otp`/`otp_expire` unchanged | — |
| TC-07 | Unknown identifier | P2 | — | POST `{"email":"nobody@gmail.com","password":"1234"}` | 404 `{"message":"User not found"}`. Note: 404 vs 401 lets an attacker tell which accounts exist | — |
| TC-08 | Missing fields are rejected before lookup | P2 | — | POST `{"password":"1234"}`, then `{"email":"salmansrabon+customer1@gmail.com"}`, then `{}` | All return 400 `{"message":"Please provide either email or phone_number along with password"}` | — |
| TC-09 | Gmail user receives the OTP email | P2 | Mail credentials configured | TC-01, then check the inbox | Email with subject `DMoney — Your Login OTP` whose body contains the same OTP as the DB and says "valid for 2 minutes". Console logs the OTP | AC-4 |
| TC-10 | Non-Gmail user: console only | P3 | Non-Gmail active user | Log in as that user | 200 `otpRequired: true`. No email. Console logs `📧 OTP email skipped — … not a Gmail address` | AC-4 |
| TC-11 | A new login replaces the previous OTP | P1 | — | 1) Login → OTP-A. 2) Login again → OTP-B (repeat until B ≠ A). 3) Verify with OTP-A. 4) Verify with OTP-B | 3) 401 `Invalid OTP. Please try again.` 4) 200 with token. `otp_expire` was reset by the second login | AC-3, AC-6 |
| TC-12 | Email failure does not change the response | P3 | Break mail config (bad `EMAIL_PASS`, no service-account file) | Login as a Gmail user | 200 `otpRequired: true`. Console shows `OTP email error:`. The user gets no email and no signal (known improvement) | AC-4 |

## 5. API — Step 2: `POST /user/verify-otp`

| ID | Title | Pri | Preconditions | Steps | Expected | AC |
|---|---|---|---|---|---|---|
| TC-13 | Valid OTP returns a JWT and clears the OTP | P1 | TC-01 done, under 2 min ago | POST `{"identifier":"salmansrabon+customer1@gmail.com","otp":"<otp>"}` | 200 `{"message":"Login successful","token":"…","role":"Customer","expiresIn":"<expires_in>"}`. Decoded JWT = `{identifier, role, iat, exp}` with `exp - iat` = `expires_in`. DB `otp`/`otp_expire` = NULL | AC-5 |
| TC-14 | Issued token works on a protected route | P1 | TC-13 token | GET `/transaction/balance/01686606902` with `Authorization: Bearer <token>` and `X-AUTH-SECRET-KEY: ROADTOSDET` | 200 with the balance | AC-5 |
| TC-15 | OTP cannot be reused | P1 | TC-13 just passed | Repeat the same verify request | 400 `{"message":"No OTP found. Please login again to request a new OTP."}` | AC-5 |
| TC-16 | Wrong OTP is rejected but not consumed | P1 | Fresh login | 1) Verify with a wrong 4-digit OTP. 2) Verify with the correct OTP | 1) 401 `Invalid OTP. Please try again.` and DB `otp` unchanged. 2) 200 with token | AC-6 |
| TC-17 | Expired OTP is rejected and cleared | P1 | Fresh login, then force expiry (§3) or wait over 2 min | 1) Verify with the correct OTP. 2) Repeat | 1) 401 `OTP has expired. Please login again to receive a new OTP.` and DB fields NULL. 2) 400 `No OTP found…` | AC-3, AC-7 |
| TC-18 | OTP still valid just before expiry | P2 | Fresh login | Set `otp_expire = NOW() + INTERVAL 10 SECOND`, then verify within 10 s | 200 with token | AC-3 |
| TC-19 | Verify with phone after logging in with email | P2 | Login by email | Verify `{"identifier":"01686606902","otp":"<otp>"}` | 200. JWT `identifier` = `01686606902` (the value posted to verify, not the login value) | AC-5 |
| TC-20 | One user's OTP doesn't work for another | P1 | Customer 1 and Customer 2 both logged in, with OTP-1 and OTP-2 | Verify Customer 2's identifier with OTP-1 (OTP-1 ≠ OTP-2) | 401 `Invalid OTP…`. Customer 2's OTP is still valid afterwards | AC-6 |
| TC-21 | Missing fields | P2 | — | POST `{"identifier":"…"}`, `{"otp":"1234"}`, `{}` | 400 `{"message":"Identifier and OTP are required"}` | — |
| TC-22 | Verify without logging in first | P2 | Customer has NULL `otp` | Verify with any OTP | 400 `No OTP found…` | — |
| TC-23 | Admin calls verify-otp | P3 | — | Verify `{"identifier":"admin@dmoney.com","otp":"1234"}` | 400 `No OTP found…` | AC-2 |
| TC-24 | Unknown identifier | P3 | — | Verify `{"identifier":"nobody@gmail.com","otp":"1234"}` | 404 `{"message":"User not found"}` | — |
| TC-25 | OTP sent as a number or with spaces | P3 | Fresh login, OTP `1234` | Send `"otp":1234` (JSON number), then on a fresh login `"otp":" 1234 "` | Both 200, because the server does `String(otp).trim()` | AC-5 |
| TC-26 | Malformed OTP values | P3 | Fresh login | Send `"12345"`, `"12a4"`, `"0000"` (no `?env`), `"otp":true` | All 401 `Invalid OTP…`. A real OTP never starts with 0, so `0000` can only be a bypass value | AC-6 |
| TC-27 | Mixed-case identifier | P3 | Fresh login | Verify with `"identifier":"SALMANSRABON+CUSTOMER1@GMAIL.COM"` | 200 if the DB collation is case-insensitive. The JWT `identifier` keeps the uppercase value. Check a downstream ownership check (known finding 01 #4) | — |

## 6. Dev Bypass — `?env=dev` + `DEFAULT_OTP` (known S-2, record current behaviour)

| ID | Title | Pri | Preconditions | Steps | Expected (current) | Note |
|---|---|---|---|---|---|---|
| TC-28 | Bypass logs in without the real OTP | P1 | `DEFAULT_OTP=0000`; fresh login | POST `/user/verify-otp?env=dev` `{"identifier":"…customer1…","otp":"0000"}` | 200 with token. DB OTP cleared | S-2. Should fail if the bypass is removed or env-gated |
| TC-29 | Bypass still needs a pending OTP | P2 | Customer `otp` NULL | Same as TC-28 without logging in first | 400 `No OTP found…` | The NULL check runs before the bypass |
| TC-30 | Bypass ignores expiry | P2 | Fresh login, then force expiry (§3) | Same as TC-28 | 200 with token, even though the OTP is expired | S-2 |
| TC-31 | Bypass needs both parts | P3 | Fresh login | 1) `?env=dev` + the real OTP. 2) `?env=prod` + `0000`. 3) No `?env` + `0000` | 1) 200 through the normal path. 2) 401. 3) 401 | — |

## 7. Security & Concurrency

| ID | Title | Pri | Preconditions | Steps | Expected | Note |
|---|---|---|---|---|---|---|
| TC-32 | OTP brute force within the 2-minute window | P1 | Fresh login | Script up to 9,000 verify calls across 1000–9999 | **Risk:** no lockout, no attempt counter, no rate limit. A wrong OTP doesn't clear the stored one, so the correct value eventually returns 200. Record the attempts and time taken | S-10; Q-1 |
| TC-33 | Two parallel verifies with the same valid OTP | P2 | Fresh login | Send 2–5 identical valid verify requests at the same moment (`xargs -P` / `Promise.all`) | **Expected:** exactly one 200, the rest 400. **Risk:** `findOne` then `update` is not atomic (`user.controller.js:506-543`), so several tokens may be issued | Candidate finding |
| TC-34 | Login race overwrites the OTP | P3 | — | Fire 2 logins in parallel, then verify with the OTP from the first console line | Only the OTP that ended up in the DB works. The other returns 401 | — |
| TC-35 | OTP not leaked by API responses | P1 | Target (Customer 2) has a pending OTP; attacker is logged in as Customer 1 | As Customer 1, GET `/user/search/email/salmansrabon+customer2@gmail.com` and `/user/list` (JWT only, no partner key needed) | **Expected:** no `otp`/`otp_expire` in the response. **Code says:** both handlers spread `user.dataValues` with no attribute filter (`user.controller.js:28,108`), so the pending OTP is returned. Customer 1 can then call verify-otp as Customer 2, which is account takeover without the dev bypass | Extends S-3/S-4; candidate finding (confirmed in code, not yet run live) |
| TC-36 | Pending or suspended user can log in | P2 | Set Customer 2 `status` to `pending`, then to `suspended` | Login + verify for each status | 200 with token. BRD says status limits transactions, not login. Follow-up: a transaction as that user is rejected | Q-2 |

## 8. Frontend — `/login` page (`dmoney-web-react`)

| ID | Title | Pri | Steps | Expected | AC |
|---|---|---|---|---|---|
| TC-37 | Customer completes OTP login | P1 | Open `/login` → enter Customer 1 email + `1234` → submit → enter the OTP from the console → `Verify OTP →` | Heading changes to "Verify Your Identity" with the banner "OTP sent to your registered email address". After verify, the user lands on an authenticated page. `localStorage` has `token, role, email, name, userId, phoneNumber, photo, balance` and the `token` cookie is set | AC-1, AC-8 |
| TC-38 | Admin skips the OTP step | P1 | Log in as `admin@dmoney.com` / `1234` | No OTP step. Redirects straight in, with storage set as in TC-37 | AC-2 |
| TC-39 | Phone number in the email field | P3 | Enter `01686606902` + `1234` | OTP step appears, and verify with the OTP succeeds (the backend reads `email` as the identifier) | AC-1 |
| TC-40 | OTP field input rules | P2 | In the OTP step type `12ab34567` | Field shows `1234` (digits only, max 4). Submitting `123` shows "Please enter the 4-digit OTP." with no network call | AC-8 |
| TC-41 | Wrong or expired OTP message | P2 | Enter a wrong OTP, then (on a fresh login) an expired one | Shows `Invalid OTP. Please try again.` / `OTP has expired. Please login again to receive a new OTP.` and stays on the OTP step | AC-8 |
| TC-42 | Back to credentials | P2 | In the OTP step click Back | Returns to the credentials form. OTP input and error are cleared | AC-8 |
| TC-43 | Bypass reachable from the UI | P2 | Open `/login?env=dev` → Customer login → enter `0000` | Logged in. The verify request URL contains `?env=dev` (`page.tsx:152`), so S-2 is reachable from the UI | S-2 |
| TC-44 | Expired session after OTP login | P3 | After TC-37, wait past `expires_in` (or set a short `expires_in` on the backend) | The token-expiry poll / `api.ts` interceptor clears the session and redirects to `/login` | — |

## 9. Schema / Migration

| ID | Title | Pri | Steps | Expected |
|---|---|---|---|---|
| TC-45 | OTP migration is idempotent | P3 | Run `node migrations/add_otp_to_users.js` twice | First run adds the columns (or skips if they exist). Second run logs `Column 'otp' already exists. Skipping.` for both columns. Columns are `otp VARCHAR(4) NULL` and `otp_expire DATETIME NULL` |

---

## 10. Open Questions

| # | Question | Why it matters |
|---|---|---|
| Q-1 | Should there be a maximum number of OTP attempts or a lockout? | The BRD defines none. TC-32 shows a 4-digit OTP can be brute-forced in 2 minutes. |
| Q-2 | Should `pending`/`suspended` users be allowed to log in? | The BRD only restricts transactions. This decides the expected result for TC-36. |
| Q-3 | Should a successful OTP be single-use under concurrent requests? | This decides whether TC-33 is a bug. |
| Q-4 | Is there a resend-OTP action other than logging in again? | The BRD and UI only offer "Back" + login again. |
| Q-5 | Should the dev bypass exist outside development? | It decides whether TC-28 to TC-31 and TC-43 expect 200 or a rejection after any S-2 fix. |

## 11. Suggested Run Order

1. **Smoke (P1):** TC-01, 04, 05, 06, 11, 13, 14, 15, 16, 17, 20, 37, 38
2. **Security:** TC-35, 28, 32, 33, 43
3. **The rest:** P2, then P3
