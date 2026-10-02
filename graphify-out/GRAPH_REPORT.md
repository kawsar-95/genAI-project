# Graph Report - r2sdet_AI  (2026-10-02)

## Corpus Check
- 162 files · ~164,797 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .css 3, .example 2)

## Summary
- 948 nodes · 1816 edges · 51 communities (49 shown, 2 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 159 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- QA Agent Definitions
- Next.js App Pages
- Legacy CRA Components
- Legacy CRA Dependencies
- Next.js Dependencies
- Blast Radius & Task Skills
- DB Migration Scripts
- User Controller
- PWA Manifest & Provider
- Frontend API Endpoint Docs
- Transaction Details Controller
- API Business Rules
- Transaction Endpoint Catalog
- Auth Middleware & Roles
- API Package Metadata
- API Runtime Dependencies
- Web Frontend Guidance
- DMoney BRD
- TypeScript Config
- Money Movement Flows
- Forgot Password Controller
- Login Auth Security Findings
- Stripe Cash-In Security
- Transaction Limit Checker
- Express App Setup
- Deposit Controller
- Stripe Cash-In Controller
- Withdraw Controller
- Deposit Bug Findings
- CRA Boilerplate Assets
- JWT Middleware & User Routes
- Service Account Email
- Personal Gmail Email
- OTP Login & Dev Bypass
- Transaction Routes
- Landing Page
- Admin Deposit & Trnx IDs
- User Auth Functions
- Payment Controller
- Send Money Controller
- Deposit Test Cases
- OTP Login UI
- Default Health Route
- Swagger Docs Loader
- Legacy CRA Shell
- Next.js Boilerplate Assets
- HTTP Server Entry
- Role-Based Navigation
- API npm Scripts
- PostCSS Config
- Road to SDET Logo

## God Nodes (most connected - your core abstractions)
1. `DMoney BRD (README.md)` - 41 edges
2. `DashboardLayout()` - 36 edges
3. `next` - 28 edges
4. `dmoney-transaction-api CLAUDE.md` - 28 edges
5. `Endpoint Catalog (endpoints.md)` - 22 edges
6. `test-design Skill` - 22 edges
7. `{ Sequelize }` - 21 edges
8. `qa-agent Skill (Hermes)` - 21 edges
9. `qa-agent-advocate Agent` - 19 edges
10. `find-bug Skill` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Admin Deposit to SYSTEM` --references--> `handleAdminDeposit()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/adminDeposit.controller.js
- `Self-registration (Gmail-only, pending status)` --references--> `registerUser()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/users/user.controller.js
- `Two-step OTP login flow` --references--> `loginUser()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/users/user.controller.js
- `Two-step OTP login flow` --references--> `verifyOtp()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/users/user.controller.js
- `Traceable Acceptance Criteria Table (From/Basis)` --semantically_similar_to--> `analyze-requirement Skill`  [INFERRED] [semantically similar]
  .claude/skills/understand-task/SKILL.md → dmoney-transaction-api/.claude/skills/analyze-requirement/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **OTP two-step login flow** — readme_two_step_otp_login, dmoney_transaction_api__artifacts_otp_test_post_user_login, dmoney_transaction_api__artifacts_otp_test_post_user_verify_otp, dmoney_transaction_api__artifacts_otp_test_loginuser, dmoney_transaction_api__artifacts_otp_test_verifyotp, dmoney_transaction_api__artifacts_otp_test_validatelogindata [INFERRED 0.95]
- **qa-agent orchestration via command and advocate subagent** — dmoney_transaction_api__claude_commands_qa_agent_qa_agent_command, dmoney_transaction_api__claude_agents_qa_agent_qa_agent, dmoney_transaction_api__claude_agents_qa_agent_advocate_qa_agent_advocate, dmoney_transaction_api__claude_agents_qa_agent_advocate_review_modes [EXTRACTED 1.00]
- **QA Pipeline: requirement -> bug hunt -> test design -> adversarial review** — dmoney_transaction_api__claude_skills_qa_agent_skill_qa_agent, dmoney_transaction_api__claude_skills_analyze_requirement_skill_analyze_requirement, dmoney_transaction_api__claude_skills_find_bug_skill_find_bug, dmoney_transaction_api__claude_skills_test_design_skill_test_design, dmoney_transaction_api__claude_skills_qa_agent_advocate_skill_qa_agent_advocate, dmoney_transaction_api__claude_skills_validate_bug_skill_validate_bug [EXTRACTED 1.00]
- **Money-moving endpoints sharing ledger + FOR UPDATE locking** — dmoney_transaction_api_claude_double_entry_ledger, dmoney_transaction_api_claude_for_update_locking_pattern, dmoney_transaction_api_endpoints_post_transaction_deposit, dmoney_transaction_api_endpoints_post_transaction_withdraw, dmoney_transaction_api_endpoints_post_transaction_sendmoney, dmoney_transaction_api_endpoints_post_transaction_payment, dmoney_transaction_api_endpoints_post_transaction_admindeposit [EXTRACTED 1.00]
- **Stripe cash-in flow and its trust/integrity findings** — dmoney_transaction_api_endpoints_post_stripe_create_intent, dmoney_transaction_api_endpoints_post_stripe_confirm, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s8_stripe_metadata_trust, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s9_confirmcashin_status, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s10_create_intent_no_rate_limit, dmoney_transaction_api_qa_findings_02_deposit_bugs_no_stripe_webhook, dmoney_transaction_api_qa_findings_03_deposit_test_cases_stripe_cash_in_ac9 [INFERRED 0.85]
- **OTP login and dev-bypass auth weakness** — dmoney_transaction_api_claude_two_step_otp_login, dmoney_transaction_api_endpoints_post_user_login, dmoney_transaction_api_endpoints_post_user_verify_otp, dmoney_transaction_api_endpoints_otp_dev_bypass, dmoney_transaction_api_qa_findings_01_login_auth_bugs_dev_otp_bypass_bug, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s2_dev_otp_bypass [INFERRED 0.85]
- **QA Agent Skill Pipeline (design, hunt, validate, adversarial review)** — dmoney_web_react__claude_skills_qa_agent_skill, dmoney_web_react__claude_skills_test_design_skill, dmoney_web_react__claude_skills_find_bug_skill, dmoney_web_react__claude_skills_validate_bug_skill, dmoney_web_react__claude_skills_qa_agent_advocate_skill, dmoney_web_react__claude_skills_analyze_requirement_skill [EXTRACTED 1.00]
- **Per-Ticket Three-File Artifact Set** — dmoney_web_react__claude_skills_test_design_skill_key_test_md, dmoney_web_react__claude_skills_find_bug_skill_key_bug_md, dmoney_web_react__claude_skills_test_design_skill_key_review_md, dmoney_web_react__claude_skills_test_design_skill_three_files_one_question [EXTRACTED 1.00]
- **Three-Layer Bug Proof Flow** — dmoney_web_react__claude_skills_validate_bug_skill_layer1_black_box, dmoney_web_react__claude_skills_validate_bug_skill_layer2_grey_box, dmoney_web_react__claude_skills_validate_bug_skill_layer3_white_box, dmoney_web_react__claude_agents_qa_agent_advocate_proof_construction, dmoney_web_react__claude_skills_validate_bug_skill_validation_status [EXTRACTED 1.00]
- **Frontend auth state kept in sync across login, middleware and api.ts** — dmoney_web_react_claude_auth_split_three_places, dmoney_web_react_claude_token_cookie, dmoney_web_react_claude_localstorage_session, dmoney_web_react_src_app_login_page, dmoney_web_react_src_middleware, dmoney_web_react_src_lib_api [EXTRACTED 1.00]
- **Customer outgoing transactions subject to daily/monthly limits** — dmoney_web_react_readme_send_money_p2p, dmoney_web_react_readme_payment, dmoney_web_react_readme_withdraw_cash_out, dmoney_web_react_readme_customer_transaction_limits, dmoney_web_react_readme_transaction_type_column, dmoney_web_react_readme_transactionlimits_table [EXTRACTED 1.00]
- **Ledger-based money movement flows feeding SYSTEM fees** — dmoney_web_react_readme_deposit_cash_in, dmoney_web_react_readme_withdraw_cash_out, dmoney_web_react_readme_send_money_p2p, dmoney_web_react_readme_payment, dmoney_web_react_readme_stripe_bank_cash_in, dmoney_web_react_readme_admin_deposit_to_system, dmoney_web_react_readme_system_account, dmoney_web_react_readme_fee_commission_structure [INFERRED 0.85]
- **CRA default React branding assets (atom logo set)** — dmoney_web_react_dmoney_reactjs_public_logo192, dmoney_web_react_dmoney_reactjs_public_logo512, dmoney_web_react_dmoney_reactjs_src_logo [INFERRED 0.95]
- **Unreferenced create-next-app template icons in public/** — dmoney_web_react_public_file_file_icon, dmoney_web_react_public_globe_globe_icon, dmoney_web_react_public_next_next_js_wordmark, dmoney_web_react_public_vercel_vercel_triangle, dmoney_web_react_public_window_browser_window_icon [INFERRED 0.85]

## Communities (51 total, 2 thin omitted)

### Community 0 - "QA Agent Definitions"
Cohesion: 0.06
Nodes (54): qa-agent Agent, adversarial-agent, qa-agent-advocate Agent, Bug Review Verdicts (REJECTED_FALSE_POSITIVE to CONFIRMED_DEFECT), mcp__db-mcp__execute_query, mcp__jira-mcp__get_jira_ticket, Reasoning Error Classification, hris-web-automation repo (Shomvob HRIS Playwright suite) (+46 more)

### Community 1 - "Next.js App Pages"
Cohesion: 0.05
Nodes (54): Default User Avatar Placeholder, nextConfig, AdminDeposit(), AdminDashboard(), AdminTransactions(), headerCellSx, ROLE_COLOR, Transaction (+46 more)

### Community 2 - "Legacy CRA Components"
Cohesion: 0.10
Nodes (30): Road to SDET Logo (API uploads), Road to SDET Logo (React public), App(), AdminDashboard(), CreateUser(), DashboardLayout(), Deposit(), Home() (+22 more)

### Community 3 - "Legacy CRA Dependencies"
Cohesion: 0.04
Nodes (45): browserslist, development, production, dependencies, axios, @emotion/react, @emotion/styled, jwt-decode (+37 more)

### Community 4 - "Next.js Dependencies"
Cohesion: 0.04
Nodes (47): dependencies, axios, @emotion/react, @emotion/styled, @mui/icons-material, @mui/material, next, react (+39 more)

### Community 5 - "Blast Radius & Task Skills"
Cohesion: 0.12
Nodes (29): Blast Radius Skill, Frontend-to-Backend HTTP Link Tracing, Understand Task Skill, loginUser controller, OTP Dev Bypass (?env=dev + DEFAULT_OTP), OTP Login Test Cases, POST /user/login, POST /user/verify-otp (+21 more)

### Community 6 - "DB Migration Scripts"
Cohesion: 0.10
Nodes (11): { sequelize }, { sequelize }, { sequelize }, { sequelize }, { sequelize }, { sequelize }, { sequelize }, { Sequelize } (+3 more)

### Community 7 - "User Controller"
Cohesion: 0.07
Nodes (17): mailer() SMTP vs Google service-account switch, fs, { hashPassword }, Joi, jwt, multer, path, { Roles } (+9 more)

### Community 8 - "PWA Manifest & Provider"
Cohesion: 0.09
Nodes (18): Hand-rolled PWA (sw.js, manifest, PWAProvider), background_color, categories, description, display, icons, lang, name (+10 more)

### Community 9 - "Frontend API Endpoint Docs"
Cohesion: 0.16
Nodes (20): DELETE /user/delete/{id}, GET /transaction/list (limit/offset), GET /transaction/statement, GET /user/list (count/page), GET /user/search/email/{email}, GET /user/search/id/{id}, GET /user/search/phonenumber/{phoneNumber}, GET /user/search/{role} (+12 more)

### Community 10 - "Transaction Details Controller"
Cohesion: 0.11
Nodes (13): { getBalance }, { Transactions }, { Users }, { hashPassword }, predefinedUsers, { sequelize }, { Sequelize, DataTypes, Op }, Users (+5 more)

### Community 11 - "API Business Rules"
Cohesion: 0.16
Nodes (15): dmoney-transaction-api CLAUDE.md, checkCustomerLimits (TransactionLimits daily/monthly caps), Commission.getConfig(transaction_type), Deposit Two Flows (SYSTEM->Agent vs Agent->Customer), dMoney Mobile-Money Wallet System, Dual env loaders (.env.dev via custom-env vs .env via dotenv), getBalance.js string-concatenated SQL, GET /transaction/limit hardcoded to 10000 (known gap) (+7 more)

### Community 12 - "Transaction Endpoint Catalog"
Cohesion: 0.14
Nodes (20): Seeded / Protected System Accounts, Endpoint Catalog (endpoints.md), GET /transaction/balance/:account, GET /transaction/statement/:account, POST /transaction/adminDeposit, POST /transaction/payment, POST /transaction/sendmoney, POST /transaction/withdraw (+12 more)

### Community 13 - "Auth Middleware & Roles"
Cohesion: 0.12
Nodes (19): authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY), Roles: SYSTEM, Admin, Agent, Customer, Merchant, GET /user/uploads/:file, Forgot/Reset Password Flow, POST /user/register, [Security] /user/uploads/:file path traversal (High), S-6 /user/uploads/:file path traversal, API Endpoints Summary (+11 more)

### Community 14 - "API Package Metadata"
Cohesion: 0.11
Nodes (18): author, description, devDependencies, nodemon, nodemon, keywords, license, main (+10 more)

### Community 15 - "API Runtime Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, body-parser, cors, custom-env, dateformat, dotenv, express, googleapis (+11 more)

### Community 16 - "Web Frontend Guidance"
Cohesion: 0.15
Nodes (13): CLAUDE.md (dmoney-web-react guidance), Env config (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SECRET_KEY, Stripe key), localStorage session keys, No lint script, ESLint config or test runner (use tsc --noEmit), Repo-local .claude QA tooling copied from hris-web-automation, token cookie (JWT, max-age from exp), QUICK_START.md (stale Next.js migration guide), Manual testing workflow (login, profile, token expiry, direct access) (+5 more)

### Community 17 - "DMoney BRD"
Cohesion: 0.20
Nodes (18): DMoney BRD (README.md), Account status lifecycle (pending/active/suspended), Admin Deposit to SYSTEM, API Endpoints Reference, Commissions table (DB-driven fees), Email notifications via Gmail API, Error Handling & HTTP Status Codes, Fee & Commission Structure (+10 more)

### Community 18 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 19 - "Money Movement Flows"
Cohesion: 0.17
Nodes (12): handleDeposit(), handlePayment(), handleSendMoney(), handleWithdraw(), Deposit (Cash-In via Agent), Payment to Merchant (with discount code), Send Money (P2P), transaction_type tag (+4 more)

### Community 20 - "Forgot Password Controller"
Cohesion: 0.15
Nodes (12): crypto, forgotPassword(), fs, { hashPassword }, mailer(), { Op }, path, { sendEmail } (+4 more)

### Community 21 - "Login Auth Security Findings"
Cohesion: 0.21
Nodes (14): publicAuthenticateJWT middleware (JWT only, no partner key), GET /user/list, Bug Findings: Login Authorization, [Security] CORS allows any origin (High), [Auth] Default ACCESS_TOKEN_SECRET 'myaccesstokensecret' enables JWT forgery (Critical), [Auth] Email vs JWT identifier case-sensitivity inconsistency (Medium), [Security] JWT lacks iss/aud/kid; no rotation (Medium), [Security] /user/list and /user/search/* return password field (Critical) (+6 more)

### Community 22 - "Stripe Cash-In Security"
Cohesion: 0.25
Nodes (13): POST /transaction/stripe/confirm, POST /transaction/stripe/create-intent, [Deposit] confirmCashIn doesn't check customer active status (High), [Security] create-intent no rate limit (Medium), Security Findings: Vulnerability Review, QA test-user rollback (DELETE Users WHERE name LIKE 'QA %'), Recommended Fix Priority (P0/P1/P2), S-10 No rate-limiting on create-intent (+5 more)

### Community 23 - "Transaction Limit Checker"
Cohesion: 0.19
Nodes (11): { DataTypes }, { sequelize }, TransactionLimit, checkCustomerLimits(), getUsage(), { Op, fn, col, literal }, OUTGOING_TYPES, { sequelize } (+3 more)

### Community 24 - "Express App Setup"
Cohesion: 0.15
Nodes (12): app, cors, defaultRoutes, express, morgan, swaggerUi, {swaggerUserDocument,swaggerTrnxDocument,}, transactionRoutes (+4 more)

### Community 25 - "Deposit Controller"
Cohesion: 0.17
Nodes (11): { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }, seedTransaction (+3 more)

### Community 26 - "Stripe Cash-In Controller"
Cohesion: 0.22
Nodes (11): { Commission }, confirmCashIn(), createPaymentIntent(), findUserByIdentifier(), { getBalance }, Stripe, { Transactions }, { Users } (+3 more)

### Community 27 - "Withdraw Controller"
Cohesion: 0.17
Nodes (11): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users } (+3 more)

### Community 28 - "Deposit Bug Findings"
Cohesion: 0.19
Nodes (13): POST /transaction/deposit, Bug Findings: Deposit / Cash-In, [Improvement] Commission returned as raw float, [Deposit] confirmCashIn trusts metadata.customer_phone (High), [Deposit] from_account taken from req.body not req.user (Low), [Security] Agent from_account spoofing risk (High), [Security] Limit endpoint no ownership check (Medium), [Deposit] No rate-limit / idempotency key on deposit (Medium) (+5 more)

### Community 29 - "CRA Boilerplate Assets"
Cohesion: 0.20
Nodes (11): Create React App Boilerplate Assets, React Default PWA Icon 192px, React Default PWA Icon 512px, background_color, display, icons, name, short_name (+3 more)

### Community 30 - "JWT Middleware & User Routes"
Cohesion: 0.21
Nodes (9): authenticateJWT(), jwt, publicAuthenticateJWT(), { authenticateJWT, publicAuthenticateJWT }, express, forgotPasswordController, router, userController (+1 more)

### Community 31 - "Service Account Email"
Cohesion: 0.20
Nodes (9): auth, { google }, path, SCOPES, sendEmail(), SERVICE_ACCOUNT_FILE, { sendEmail }, testServiceAccountEmail() (+1 more)

### Community 32 - "Personal Gmail Email"
Cohesion: 0.20
Nodes (10): fs, { google }, nodemailer, path, SCOPES, sendPersonalEmail(), SERVICE_ACCOUNT_FILE, { sendPersonalEmail } (+2 more)

### Community 33 - "OTP Login & Dev Bypass"
Cohesion: 0.22
Nodes (11): Two-step OTP Login, OTP Dev Bypass (?env=dev + DEFAULT_OTP 0000), POST /user/login, POST /user/verify-otp, [Auth] Dev OTP bypass defeats Customer/Agent/Merchant 2FA (Critical), [Auth] ?env=dev honored without NODE_ENV gate, [Improvement] Login response lacks consistent requiresOtp flag, Basic End-to-End Deposit Test (+3 more)

### Community 34 - "Transaction Routes"
Cohesion: 0.18
Nodes (10): adminDepositController, { authenticateJWT }, depositController, express, paymentController, router, sendMoneyController, stripeCashInController (+2 more)

### Community 35 - "Landing Page"
Cohesion: 0.18
Nodes (3): features, roles, stats

### Community 36 - "Admin Deposit & Trnx IDs"
Cohesion: 0.24
Nodes (8): { generateTrnxId }, handleAdminDeposit(), { sequelize }, { Transaction }, { Transactions }, { Users }, crypto, generateTrnxId()

### Community 37 - "User Auth Functions"
Cohesion: 0.27
Nodes (10): resetPassword(), createUser(), loginUser(), mailer(), partialUpdateUser(), registerUser(), updateUser(), validateRegistration() (+2 more)

### Community 38 - "Payment Controller"
Cohesion: 0.22
Nodes (8): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }

### Community 39 - "Send Money Controller"
Cohesion: 0.22
Nodes (8): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }

### Community 40 - "Deposit Test Cases"
Cohesion: 0.39
Nodes (9): Test Cases: Deposit / Cash-In, Deposit Acceptance Criteria AC-1..AC-10, Agent 2.5% Deposit Commission (AC-2), Concurrent deposits do not overdraw Agent (TC-022), Customer Wallet Cap 10,000 BDT (AC-3), Deposit Min 10 / Max 10,000 BDT (AC-4), Reject deposit from another user's account (AC-8), Stripe Cash-in via PaymentIntent (AC-9) (+1 more)

### Community 41 - "OTP Login UI"
Cohesion: 0.32
Nodes (6): verifyOtp(), POST /user/login, Login page two-phase UI, darkField, Login(), LoginContent()

### Community 42 - "Default Health Route"
Cohesion: 0.29
Nodes (4): defaultController, express, router, express

### Community 43 - "Swagger Docs Loader"
Cohesion: 0.29
Nodes (5): fs, swaggerTrnxDocument, swaggerUserDocument, yaml, js-yaml

### Community 44 - "Legacy CRA Shell"
Cohesion: 0.40
Nodes (6): dmoney-reactjs legacy CRA app, Legacy CRA index.html, #root mount div, Legacy robots.txt, Legacy CRA README, Create React App scripts (start/test/build/eject)

### Community 45 - "Next.js Boilerplate Assets"
Cohesion: 0.33
Nodes (6): create-next-app Boilerplate Assets, File Document Icon (file.svg), Globe Icon (globe.svg), Next.js Wordmark (next.svg), Vercel Triangle Logo (vercel.svg), Browser Window Icon (window.svg)

### Community 46 - "HTTP Server Entry"
Cohesion: 0.40
Nodes (3): app, http, server

### Community 47 - "Role-Based Navigation"
Cohesion: 0.50
Nodes (4): Frontend role-based navigation menus, Role-Based Feature Access Matrix, User roles (Admin/Agent/Customer/Merchant/SYSTEM), ROLE_MENUS

### Community 48 - "API npm Scripts"
Cohesion: 0.67
Nodes (3): scripts, dev, start

## Ambiguous Edges - Review These
- `dMoney MFS Platform` → `qa-agent Subagent (HRIS-scoped)`  [AMBIGUOUS]
  dmoney-transaction-api/.claude/agents/qa-agent.md · relation: conceptually_related_to
- `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` → `X-AUTH-SECRET-KEY documented as only for user creation`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md · relation: conceptually_related_to
- `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` → `Separate security list items (BearerAuth OR XAuthSecretKey)`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/swaggerTrnx.yaml · relation: conceptually_related_to
- `GET /user/uploads/:file` → `/user/uploads/:file documented as no authentication required`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md · relation: conceptually_related_to
- `QUICK_START.md is stale` → `Next.js migration progress (~20%)`  [AMBIGUOUS]
  dmoney-web-react/QUICK_START.md · relation: conceptually_related_to
- `Self-Statement with client-side date filter and running balance` → `GET /transaction/statement`  [AMBIGUOUS]
  dmoney-web-react/api_doc/API_ENDPOINTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **368 isolated node(s):** `{ sequelize }`, `express`, `app`, `morgan`, `cors` (+363 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 421 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `dMoney MFS Platform` and `qa-agent Subagent (HRIS-scoped)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` and `X-AUTH-SECRET-KEY documented as only for user creation`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` and `Separate security list items (BearerAuth OR XAuthSecretKey)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GET /user/uploads/:file` and `/user/uploads/:file documented as no authentication required`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `QUICK_START.md is stale` and `Next.js migration progress (~20%)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Self-Statement with client-side date filter and running balance` and `GET /transaction/statement`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `DMoney BRD (README.md)` connect `DMoney BRD` to `OTP Login UI`, `Frontend API Endpoint Docs`, `Role-Based Navigation`, `Web Frontend Guidance`, `Money Movement Flows`, `Stripe Cash-In Controller`, `JWT Middleware & User Routes`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._