# Graph Report - r2sdet_AI  (2026-10-07)

## Corpus Check
- 202 files · ~746,546 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .css 3, .example 2)

## Summary
- 1478 nodes · 2346 edges · 91 communities (84 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 208 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a712ce0b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test-design Skill
- DashboardLayout
- ref_react
- dmoney-reactjs/package.json
- dmoney-web-react/package.json
- test-design Skill
- db.js
- user.controller.js
- dmoney-web-react/public/manifest.json
- 4. System Behavior Tests
- API_ENDPOINTS.md
- dmoney-transaction-api CLAUDE.md
- Endpoint Catalog (endpoints.md)
- Graphify & Serena: Advanced Code Analysis, Dependency Mapping, and AI Test Engineering
- dmoney-transaction-api/package.json
- dependencies
- CLAUDE.md (dmoney-web-react guidance)
- DMoney BRD (README.md)
- compilerOptions
- AI Agent Testing & Test Automation Framework Implementation
- forgotPassword.controller.js
- Security Findings: Vulnerability Review
- Architecting AI Systems for Advanced Quality Engineering
- Procedure
- app.js
- Users.js
- stripeCashIn.controller.js
- withdraw.controller.js
- Bug Findings: Deposit / Cash-In
- dmoney-reactjs/public/manifest.json
- user.route.js
- emailHelper.js
- gmailPersonalHelper.js
- User Management API Swagger Spec
- transaction.route.js
- app/page.tsx
- Procedure
- Test Design
- checkCustomerLimits
- sendMoney.controller.js
- Test Cases: Deposit / Cash-In
- cash-in-bank/page.tsx
- default.route.js
- Session Log — 2026-10-04
- Comprehensive Architecture & Workflow Guide: Agentic Software Testing with Claude AI
- create-next-app Boilerplate Assets
- server.js
- Shared setup (applies to every charter)
- PR #8 — Review record
- postcss.config.mjs
- Road to SDET Logo (gold RS monogram on black)
- Mastering AI Agents for Semantic Bug Discovery & Automation
- AI-Driven Quality Engineering: Project Setup, Knowledge Graphs & Change Impact Analysis
- Report — Blast Radius vs Graphify
- Report — Customer Transaction Limits
- payment.controller.js
- Low Priority
- Session Log — 2026-10-03
- Test Result — 03-deposit-test-cases
- Steps
- test-executor-agent.md
- login/page.tsx
- Low Priority
- SM-H01 Requirement Analysis: Send Money must reject a request with a missing account
- Procedure
- Road to SDET Logo (React public)
- SM-H01 Review: A request without from_account or to_account crashes the API
- SM-H02 Requirement Analysis: Daily transaction-count limit must hold under concurrent Send Money requests
- SM-L01 Requirement Analysis: Send Money must reject non-numeric amount formats
- playwright
- SM-L02 Requirement Analysis: Send Money receipt "Total Amount" must include the service fee
- graphify-prehook.sh
- SM-L02 Review: Receipt "Total Amount" excludes the service fee that was debited
- SM-L03 Requirement Analysis: A non-string receiver must be a validation error, not an internal error
- SM-L03 Review: A non-string receiver value fails with HTTP 500 and the raw internal validation message
- SM-M01 Requirement Analysis: Send Money must reject transfers to the sender's own account
- SM-M01 Review: Sending to own account with a trailing space in the receiver number is accepted
- SM-M02 Requirement Analysis: Send Money amounts must not have more than two decimal places
- Two-step OTP login flow
- SM-H02 Review: Concurrent send-money requests exceed the daily transaction-count limit
- SM-L01 Review: Non-numeric amount forms such as "0x10", "1e1" and [20] are accepted
- profile/page.tsx
- SM-M02 Review: Amounts with more than two decimal places are accepted and stored unrounded
- SelfStatement.tsx
- users/page.tsx
- Test Result — PR-8
- Frontend role-based navigation menus
- Test Result — 03-deposit-test-cases (High priority)
- Self-Statement with client-side date filter and running balance

## God Nodes (most connected - your core abstractions)
1. `DMoney BRD (README.md)` - 41 edges
2. `DashboardLayout()` - 35 edges
3. `next` - 28 edges
4. `dmoney-transaction-api CLAUDE.md` - 28 edges
5. `4. System Behavior Tests` - 26 edges
6. `checkCustomerLimits()` - 25 edges
7. `test-design Skill` - 22 edges
8. `Endpoint Catalog (endpoints.md)` - 22 edges
9. `getBalance()` - 21 edges
10. `qa-agent Skill (Hermes)` - 21 edges

## Surprising Connections (you probably didn't know these)
- `2. Serena: code relationships (mandatory)` --references--> `getBalance()`  [INFERRED]
  .claude/skills/find-bug/SKILL.md → dmoney-transaction-api/services/getBalance.js
- `Deposit (Cash-In via Agent)` --references--> `handleDeposit()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/deposit.controller.js
- `Payment to Merchant (with discount code)` --references--> `handlePayment()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/payment.controller.js
- `Withdraw (Cash-Out)` --references--> `handleWithdraw()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/withdraw.controller.js
- `Two-step OTP login flow` --references--> `verifyOtp()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/users/user.controller.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Money-moving endpoints sharing ledger + FOR UPDATE locking** — dmoney_transaction_api_claude_double_entry_ledger, dmoney_transaction_api_claude_for_update_locking_pattern, dmoney_transaction_api_endpoints_post_transaction_deposit, dmoney_transaction_api_endpoints_post_transaction_withdraw, dmoney_transaction_api_endpoints_post_transaction_sendmoney, dmoney_transaction_api_endpoints_post_transaction_payment, dmoney_transaction_api_endpoints_post_transaction_admindeposit [EXTRACTED 1.00]
- **Frontend auth state kept in sync across login, middleware and api.ts** — dmoney_web_react_claude_auth_split_three_places, dmoney_web_react_claude_token_cookie, dmoney_web_react_claude_localstorage_session, dmoney_web_react_src_app_login_page, dmoney_web_react_src_middleware, dmoney_web_react_src_lib_api [EXTRACTED 1.00]
- **Customer outgoing transactions subject to daily/monthly limits** — dmoney_web_react_readme_send_money_p2p, dmoney_web_react_readme_payment, dmoney_web_react_readme_withdraw_cash_out, dmoney_web_react_readme_customer_transaction_limits, dmoney_web_react_readme_transaction_type_column, dmoney_web_react_readme_transactionlimits_table [EXTRACTED 1.00]
- **qa-agent orchestration via command and advocate subagent** — dmoney_transaction_api__claude_commands_qa_agent_qa_agent_command, dmoney_transaction_api__claude_agents_qa_agent_qa_agent, dmoney_transaction_api__claude_agents_qa_agent_advocate_qa_agent_advocate, dmoney_transaction_api__claude_agents_qa_agent_advocate_review_modes [EXTRACTED 1.00]
- **QA Agent Skill Pipeline (design, hunt, validate, adversarial review)** — dmoney_web_react__claude_skills_qa_agent_skill, dmoney_web_react__claude_skills_test_design_skill, dmoney_web_react__claude_skills_find_bug_skill, dmoney_web_react__claude_skills_validate_bug_skill, dmoney_web_react__claude_skills_qa_agent_advocate_skill, dmoney_web_react__claude_skills_analyze_requirement_skill [EXTRACTED 1.00]
- **QA Pipeline: requirement -> bug hunt -> test design -> adversarial review** — dmoney_transaction_api__claude_skills_qa_agent_skill_qa_agent, dmoney_transaction_api__claude_skills_analyze_requirement_skill_analyze_requirement, dmoney_transaction_api__claude_skills_find_bug_skill_find_bug, dmoney_transaction_api__claude_skills_test_design_skill_test_design, dmoney_transaction_api__claude_skills_qa_agent_advocate_skill_qa_agent_advocate, dmoney_transaction_api__claude_skills_validate_bug_skill_validate_bug [EXTRACTED 1.00]
- **Three-Layer Bug Proof Flow** — dmoney_web_react__claude_skills_validate_bug_skill_layer1_black_box, dmoney_web_react__claude_skills_validate_bug_skill_layer2_grey_box, dmoney_web_react__claude_skills_validate_bug_skill_layer3_white_box, dmoney_web_react__claude_agents_qa_agent_advocate_proof_construction, dmoney_web_react__claude_skills_validate_bug_skill_validation_status [EXTRACTED 1.00]
- **Per-Ticket Three-File Artifact Set** — dmoney_web_react__claude_skills_test_design_skill_key_test_md, dmoney_web_react__claude_skills_find_bug_skill_key_bug_md, dmoney_web_react__claude_skills_test_design_skill_key_review_md, dmoney_web_react__claude_skills_test_design_skill_three_files_one_question [EXTRACTED 1.00]
- **Ledger-based money movement flows feeding SYSTEM fees** — dmoney_web_react_readme_deposit_cash_in, dmoney_web_react_readme_withdraw_cash_out, dmoney_web_react_readme_send_money_p2p, dmoney_web_react_readme_payment, dmoney_web_react_readme_stripe_bank_cash_in, dmoney_web_react_readme_admin_deposit_to_system, dmoney_web_react_readme_system_account, dmoney_web_react_readme_fee_commission_structure [INFERRED 0.85]
- **OTP login and dev-bypass auth weakness** — dmoney_transaction_api_claude_two_step_otp_login, dmoney_transaction_api_endpoints_post_user_login, dmoney_transaction_api_endpoints_post_user_verify_otp, dmoney_transaction_api_endpoints_otp_dev_bypass, dmoney_transaction_api_qa_findings_01_login_auth_bugs_dev_otp_bypass_bug, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s2_dev_otp_bypass [INFERRED 0.85]
- **Stripe cash-in flow and its trust/integrity findings** — dmoney_transaction_api_endpoints_post_stripe_create_intent, dmoney_transaction_api_endpoints_post_stripe_confirm, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s8_stripe_metadata_trust, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s9_confirmcashin_status, dmoney_transaction_api_qa_findings_04_security_vulnerabilities_s10_create_intent_no_rate_limit, dmoney_transaction_api_qa_findings_02_deposit_bugs_no_stripe_webhook, dmoney_transaction_api_qa_findings_03_deposit_test_cases_stripe_cash_in_ac9 [INFERRED 0.85]
- **Unreferenced create-next-app template icons in public/** — dmoney_web_react_public_file_file_icon, dmoney_web_react_public_globe_globe_icon, dmoney_web_react_public_next_next_js_wordmark, dmoney_web_react_public_vercel_vercel_triangle, dmoney_web_react_public_window_browser_window_icon [INFERRED 0.85]
- **CRA default React branding assets (atom logo set)** — dmoney_web_react_dmoney_reactjs_public_logo192, dmoney_web_react_dmoney_reactjs_public_logo512, dmoney_web_react_dmoney_reactjs_src_logo [INFERRED 0.95]
- **OTP two-step login flow** — readme_two_step_otp_login, dmoney_transaction_api__artifacts_otp_test_post_user_login, dmoney_transaction_api__artifacts_otp_test_post_user_verify_otp, dmoney_transaction_api__artifacts_otp_test_loginuser, dmoney_transaction_api__artifacts_otp_test_verifyotp, dmoney_transaction_api__artifacts_otp_test_validatelogindata [INFERRED 0.95]

## Communities (91 total, 7 thin omitted)

### Community 0 - "test-design Skill"
Cohesion: 0.06
Nodes (54): qa-agent Agent, adversarial-agent, qa-agent-advocate Agent, Bug Review Verdicts (REJECTED_FALSE_POSITIVE to CONFIRMED_DEFECT), mcp__db-mcp__execute_query, mcp__jira-mcp__get_jira_ticket, Reasoning Error Classification, hris-web-automation repo (Shomvob HRIS Playwright suite) (+46 more)

### Community 1 - "DashboardLayout"
Cohesion: 0.07
Nodes (42): nextConfig, AdminDashboard(), AdminTransactions(), headerCellSx, ROLE_COLOR, Transaction, UserInfo, CreateUser() (+34 more)

### Community 2 - "ref_react"
Cohesion: 0.16
Nodes (20): App(), AdminDashboard(), CreateUser(), DashboardLayout(), Deposit(), Home(), LeftMenu(), Login() (+12 more)

### Community 3 - "dmoney-reactjs/package.json"
Cohesion: 0.04
Nodes (45): browserslist, development, production, dependencies, axios, @emotion/react, @emotion/styled, jwt-decode (+37 more)

### Community 4 - "dmoney-web-react/package.json"
Cohesion: 0.05
Nodes (37): dependencies, axios, @emotion/react, @emotion/styled, @mui/icons-material, @mui/material, next, react (+29 more)

### Community 5 - "test-design Skill"
Cohesion: 0.12
Nodes (29): Blast Radius Skill, Frontend-to-Backend HTTP Link Tracing, Understand Task Skill, loginUser controller, OTP Dev Bypass (?env=dev + DEFAULT_OTP), OTP Login Test Cases, POST /user/login, POST /user/verify-otp (+21 more)

### Community 6 - "db.js"
Cohesion: 0.08
Nodes (14): { sequelize }, { sequelize }, { sequelize }, { sequelize }, { sequelize }, { sequelize }, { sequelize }, { Sequelize } (+6 more)

### Community 7 - "user.controller.js"
Cohesion: 0.07
Nodes (25): resetPassword(), createUser(), fs, { hashPassword }, Joi, jwt, loginUser(), mailer() (+17 more)

### Community 8 - "dmoney-web-react/public/manifest.json"
Cohesion: 0.09
Nodes (18): Hand-rolled PWA (sw.js, manifest, PWAProvider), background_color, categories, description, display, icons, lang, name (+10 more)

### Community 9 - "4. System Behavior Tests"
Cohesion: 0.06
Nodes (33): 1. Feature Summary, 2. Acceptance Criteria, 3. Basic Test — verify the feature works end to end, 4. System Behavior Tests, 4a. New behavior, 4b. Related regression, 5. White-box Tests, 6. Coverage Summary (+25 more)

### Community 10 - "API_ENDPOINTS.md"
Cohesion: 0.20
Nodes (16): DELETE /user/delete/{id}, GET /transaction/list (limit/offset), GET /user/list (count/page), GET /user/search/email/{email}, GET /user/search/id/{id}, GET /user/search/phonenumber/{phoneNumber}, GET /user/search/{role}, PATCH /user/update/{id} (+8 more)

### Community 11 - "dmoney-transaction-api CLAUDE.md"
Cohesion: 0.18
Nodes (12): dmoney-transaction-api CLAUDE.md, checkCustomerLimits (TransactionLimits daily/monthly caps), dMoney Mobile-Money Wallet System, Dual env loaders (.env.dev via custom-env vs .env via dotenv), getBalance.js string-concatenated SQL, GET /transaction/limit hardcoded to 10000 (known gap), No test runner configured (CI npm test will fail), Idempotent one-off migration scripts (+4 more)

### Community 12 - "Endpoint Catalog (endpoints.md)"
Cohesion: 0.12
Nodes (25): authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY), Roles: SYSTEM, Admin, Agent, Customer, Merchant, Endpoint Catalog (endpoints.md), GET /transaction/balance/:account, GET /transaction/statement/:account, POST /transaction/adminDeposit, POST /transaction/payment, POST /transaction/sendmoney (+17 more)

### Community 13 - "Graphify & Serena: Advanced Code Analysis, Dependency Mapping, and AI Test Engineering"
Cohesion: 0.10
Nodes (20): 1. The Big Picture: Architecture Analogy, 2. Graphify: Macro Architectural Knowledge Graph, 3. Serena: Micro Symbol-Level IDE Engine, 4. Technical Feature Comparison: Graphify vs. Serena, 5. The 5-Stage Test Engineering Pipeline (Prompt Chaining), 6. Installation & Activation Workflow, 7. Key Takeaways & Best Practices, Core Capabilities (+12 more)

### Community 14 - "dmoney-transaction-api/package.json"
Cohesion: 0.09
Nodes (22): author, description, devDependencies, nodemon, nodemon, keywords, license, main (+14 more)

### Community 15 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, body-parser, cors, custom-env, dateformat, dotenv, express, googleapis (+11 more)

### Community 16 - "CLAUDE.md (dmoney-web-react guidance)"
Cohesion: 0.15
Nodes (12): CLAUDE.md (dmoney-web-react guidance), Env config (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SECRET_KEY, Stripe key), localStorage session keys, No lint script, ESLint config or test runner (use tsc --noEmit), Repo-local .claude QA tooling copied from hris-web-automation, token cookie (JWT, max-age from exp), QUICK_START.md (stale Next.js migration guide), Manual testing workflow (login, profile, token expiry, direct access) (+4 more)

### Community 17 - "DMoney BRD (README.md)"
Cohesion: 0.15
Nodes (21): DMoney BRD (README.md), Admin Deposit to SYSTEM, API Endpoints Reference, Commissions table (DB-driven fees), Deposit (Cash-In via Agent), Error Handling & HTTP Status Codes, Fee & Commission Structure, Payment to Merchant (with discount code) (+13 more)

### Community 18 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 19 - "AI Agent Testing & Test Automation Framework Implementation"
Cohesion: 0.11
Nodes (18): 1. Architectural Overview & System Mental Model, 2. Core Differences: Main Agent vs. Sub-Agents vs. Skills, 3. End-to-End Agentic STLC Workflow, 4. Practical Implementation Techniques, 5. Tooling Strategy: CLI Fast-Path vs. Deep Browser Automation, 6. 2026 Industry Standards for Agent Evaluation, A Comprehensive Blueprint: From Local Sub-Agent Architecture to Production-Grade Agentic QA (2026), A. Few-Shot Prompting for Clean Formatting (+10 more)

### Community 20 - "forgotPassword.controller.js"
Cohesion: 0.15
Nodes (12): crypto, forgotPassword(), fs, { hashPassword }, mailer(), { Op }, path, { sendEmail } (+4 more)

### Community 21 - "Security Findings: Vulnerability Review"
Cohesion: 0.12
Nodes (28): mailer() SMTP vs Google service-account switch, publicAuthenticateJWT middleware (JWT only, no partner key), GET /user/list, GET /user/uploads/:file, Bug Findings: Login Authorization, [Security] CORS allows any origin (High), [Auth] Default ACCESS_TOKEN_SECRET 'myaccesstokensecret' enables JWT forgery (Critical), [Auth] Email vs JWT identifier case-sensitivity inconsistency (Medium) (+20 more)

### Community 22 - "Architecting AI Systems for Advanced Quality Engineering"
Cohesion: 0.11
Nodes (17): 1. The 3-Layer AI System Architecture, 2. Advanced Prompt Engineering: The 6-Factor Framework, 3. Core Architectural Pillars of Agentic QE, 4. Claude Code QE Repository Architecture, 5. LLM Model Allocation Strategy in Quality Engineering, 6. The Role of Model Context Protocol (MCP) in Modern Testing, A. Context Engineering, Architecting AI Systems for Advanced Quality Engineering (+9 more)

### Community 23 - "Procedure"
Cohesion: 0.13
Nodes (14): 10. Reply to the user, 1. Parse the test file, 2. Decide scope, 3. Prepare the environment, 4. Execute each case, in order, 5. Test Result values (exactly these three), 6. Result wording (Test Data, Expected Result, Actual Result), 7. Blocked cases (+6 more)

### Community 24 - "app.js"
Cohesion: 0.11
Nodes (17): app, cors, defaultRoutes, express, morgan, swaggerUi, {swaggerUserDocument,swaggerTrnxDocument,}, transactionRoutes (+9 more)

### Community 25 - "Users.js"
Cohesion: 0.07
Nodes (24): { generateTrnxId }, handleAdminDeposit(), { sequelize }, { Transaction }, { Transactions }, { Users }, { getBalance }, getBalanceByAccount() (+16 more)

### Community 26 - "stripeCashIn.controller.js"
Cohesion: 0.15
Nodes (16): { Commission }, confirmCashIn(), createPaymentIntent(), findUserByIdentifier(), { getBalance }, Stripe, { Transactions }, { Users } (+8 more)

### Community 27 - "withdraw.controller.js"
Cohesion: 0.10
Nodes (19): { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }, { checkCustomerLimits } (+11 more)

### Community 28 - "Bug Findings: Deposit / Cash-In"
Cohesion: 0.16
Nodes (17): Commission.getConfig(transaction_type), Deposit Two Flows (SYSTEM->Agent vs Agent->Customer), POST /transaction/stripe/create-intent, POST /transaction/deposit, Bug Findings: Deposit / Cash-In, [Improvement] Commission returned as raw float, [Deposit] Commission ledger row credit/debit reads like over-debit (Medium), [Security] create-intent no rate limit (Medium) (+9 more)

### Community 29 - "dmoney-reactjs/public/manifest.json"
Cohesion: 0.13
Nodes (17): Create React App Boilerplate Assets, dmoney-reactjs legacy CRA app, Legacy CRA index.html, #root mount div, React Default PWA Icon 192px, React Default PWA Icon 512px, background_color, display (+9 more)

### Community 30 - "user.route.js"
Cohesion: 0.19
Nodes (10): 7. The `GET /transaction/limit/:account` endpoint, authenticateJWT(), jwt, publicAuthenticateJWT(), { authenticateJWT, publicAuthenticateJWT }, express, forgotPasswordController, router (+2 more)

### Community 31 - "emailHelper.js"
Cohesion: 0.20
Nodes (9): auth, { google }, path, SCOPES, sendEmail(), SERVICE_ACCOUNT_FILE, { sendEmail }, testServiceAccountEmail() (+1 more)

### Community 32 - "gmailPersonalHelper.js"
Cohesion: 0.20
Nodes (10): fs, { google }, nodemailer, path, SCOPES, sendPersonalEmail(), SERVICE_ACCOUNT_FILE, { sendPersonalEmail } (+2 more)

### Community 33 - "User Management API Swagger Spec"
Cohesion: 0.13
Nodes (18): Two-step OTP Login, OTP Dev Bypass (?env=dev + DEFAULT_OTP 0000), Forgot/Reset Password Flow, POST /user/login, POST /user/register, POST /user/verify-otp, [Auth] Dev OTP bypass defeats Customer/Agent/Merchant 2FA (Critical), [Auth] ?env=dev honored without NODE_ENV gate (+10 more)

### Community 34 - "transaction.route.js"
Cohesion: 0.18
Nodes (10): adminDepositController, { authenticateJWT }, depositController, express, paymentController, router, sendMoneyController, stripeCashInController (+2 more)

### Community 35 - "app/page.tsx"
Cohesion: 0.18
Nodes (3): features, roles, stats

### Community 36 - "Procedure"
Cohesion: 0.14
Nodes (12): Reviewer Prompt Template, 1. Collect PR facts, 2. Collect the requirements, 3. Send the reviewer, 4. Verify the findings (rule 3), 5. Decide the verdicts, 6. Write one report per issue, 7. Reply to the user (+4 more)

### Community 37 - "Test Design"
Cohesion: 0.14
Nodes (13): 1. Gather context (never skip), 1. Requirement Highlights, 2. Procedure, 2. Test Cases, 3. Prioritized Test Titles, 3. Techniques & coverage checklist, 4. Priority rules, 4b. Type tags (+5 more)

### Community 38 - "checkCustomerLimits"
Cohesion: 0.12
Nodes (31): 4. Same target, both tools, Blast Radius result (worked example in the skill), Graphify results (run 2026-10-03), Affected backend endpoints, Affected frontend routes, Blast Radius: fix/send-money-bugs vs main (1a99e4c), Breaks, Changed files (+23 more)

### Community 39 - "sendMoney.controller.js"
Cohesion: 0.09
Nodes (13): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users } (+5 more)

### Community 40 - "Test Cases: Deposit / Cash-In"
Cohesion: 0.21
Nodes (16): POST /transaction/stripe/confirm, [Deposit] confirmCashIn doesn't check customer active status (High), [Deposit] confirmCashIn trusts metadata.customer_phone (High), [Improvement] No Stripe webhook endpoint, Test Cases: Deposit / Cash-In, Deposit Acceptance Criteria AC-1..AC-10, Agent 2.5% Deposit Commission (AC-2), Concurrent deposits do not overdraw Agent (TC-022) (+8 more)

### Community 41 - "cash-in-bank/page.tsx"
Cohesion: 0.29
Nodes (7): CARD_ELEMENT_OPTIONS, CashInBank(), PaymentForm(), PaymentFormProps, stripePromise, @stripe/react-stripe-js, @stripe/stripe-js

### Community 42 - "default.route.js"
Cohesion: 0.29
Nodes (4): defaultController, express, router, express

### Community 43 - "Session Log — 2026-10-04"
Cohesion: 0.08
Nodes (23): Add the tools to the agent, Align the report with the skill, Beautify the payloads, Code trace only, verified by the reviewer, Create the reviewer, execute-test skill and test-executor-agent, Execute the first 5 High cases, Find bugs with the four skills (+15 more)

### Community 44 - "Comprehensive Architecture & Workflow Guide: Agentic Software Testing with Claude AI"
Cohesion: 0.12
Nodes (15): 1.1 The Context Overflow Challenge in Multi-Repo / Microservice Environments, 1.2 Initializing Project Memory (`CLAUDE.md`), 1. Core Architectural Setup & Context Engineering, 2. Operational Modes in Agentic Workflows, 3.1 Requirement Analysis Skill (`analyze-requirement`), 3.2 Blast Radius & Impact Analysis Skill (`blast-radius`), 3. Modular Skill Architecture (`.claude/skills/`), 4. Software QA Testing Philosophy & White-Box Testing (+7 more)

### Community 45 - "create-next-app Boilerplate Assets"
Cohesion: 0.33
Nodes (6): create-next-app Boilerplate Assets, File Document Icon (file.svg), Globe Icon (globe.svg), Next.js Wordmark (next.svg), Vercel Triangle Logo (vercel.svg), Browser Window Icon (window.svg)

### Community 46 - "server.js"
Cohesion: 0.40
Nodes (3): app, http, server

### Community 47 - "Shared setup (applies to every charter)"
Cohesion: 0.17
Nodes (11): CH-1: Concurrency against the shared daily/monthly limit · Priority: High · Time-box: 90 min, CH-2: Malformed Send Money requests vs service availability · Priority: High · Time-box: 60 min, CH-3: Account identity and the own-account rule · Priority: High · Time-box: 60 min, CH-4: Amount parsing, precision and error contract · Priority: Med · Time-box: 60 min, CH-5: Regression of Payment and Cash Out on the shared limit service, and lock contention · Priority: Med · Time-box: 60 min, CH-6: Send Money receipt vs ledger · Priority: Low · Time-box: 60 min, Charter Index, Open Questions (+3 more)

### Community 48 - "PR #8 — Review record"
Cohesion: 0.20
Nodes (10): E1. Case evidence map, E2. Evidence Gaps / Conflicts, E3. Assumptions, E4. Caller-trace record, E5. Impact matrix (materially affected rows), E6. Deliberate exclusions, E7. Bug candidates, E8. Review outcome (+2 more)

### Community 51 - "Mastering AI Agents for Semantic Bug Discovery & Automation"
Cohesion: 0.13
Nodes (14): 1. Architectural Tooling Stack, 2. Deterministic Workflow Control via Pre-Hooks, 3. The End-to-End Bug Discovery Process, 4. Prompt Engineering & Skill File Architecture, 5. Realistic Assessment & Industry Best Practices, Black-Box Tools (Behavioral & Interface Verification), Bug Report Output Format, Executive Summary (+6 more)

### Community 52 - "AI-Driven Quality Engineering: Project Setup, Knowledge Graphs & Change Impact Analysis"
Cohesion: 0.15
Nodes (12): 1. System Architecture & Project Setup (DMoney Platform), 1. Workspace vs. Sub-Project Context (`CLAUDE.md`), 2. AI Tooling & Knowledge Graph Integration (Graphify), 2. Guardrails & Security Hooks (`settings.json`), 3. Automated Git Hook Integration, 3. Comparison: Graphify vs. Blast Radius, 4. Workspace Architecture & SQA Best Practices, 5. Modern Quality Engineering Principles (+4 more)

### Community 53 - "Report — Blast Radius vs Graphify"
Cohesion: 0.15
Nodes (12): 1. Summary, 2. Side by side, 3. How each one works, 5. Strengths and limits, 6. When to use which, 7. Using them together, 8. Caveats, Blast Radius (+4 more)

### Community 54 - "Report — Customer Transaction Limits"
Cohesion: 0.15
Nodes (12): 1. Summary, 2. Configured values, 3. Who and what is limited, 4. How the check works, 5. Boundary behaviour, 8. Suggested test scenarios, Error response, Handy SQL (+4 more)

### Community 55 - "payment.controller.js"
Cohesion: 0.22
Nodes (8): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }

### Community 56 - "Low Priority"
Cohesion: 0.11
Nodes (18): Cash-In Module Bugs, CASHIN-L01, CASHIN-L02, CASHIN-L03, CASHIN-L04, CASHIN-L05, CASHIN-L07, CASHIN-M01 (+10 more)

### Community 57 - "Session Log — 2026-10-03"
Cohesion: 0.08
Nodes (24): 16:45 — First bug hunt, 16:47 — Save as a file, 16:50 — Rename, 16:51 — Were the tools used?, 17:33 — Asked again, more specifically, 17:51 — Spec for the skill (pasted), 17:57 — Run it on cash-in, 17:58 — Install agent-browser (separate session) (+16 more)

### Community 58 - "Test Result — 03-deposit-test-cases"
Cohesion: 0.50
Nodes (3): Results, Summary, Test Result — 03-deposit-test-cases

### Community 59 - "Steps"
Cohesion: 0.14
Nodes (13): 10. Reply to the user, 1. Scope and known issues, 2. Serena: code relationships (mandatory), 3. graphify: domain knowledge (mandatory), 4. /blast-radius (mandatory), 5. Build candidates, 6. Reproduce: frontend first with agent-browser, 7. Fall back to API only when the UI can't reproduce (+5 more)

### Community 61 - "login/page.tsx"
Cohesion: 0.13
Nodes (10): darkField, darkField, Login(), LoginContent(), darkField, darkSelect, roleInfo, darkField (+2 more)

### Community 62 - "Low Priority"
Cohesion: 0.15
Nodes (12): High Priority, Low Priority, Medium Priority, Section 1: List of Bugs, Section 2: Summary, Send Money Bugs, SM-H01, SM-L01 (+4 more)

### Community 63 - "SM-H01 Requirement Analysis: Send Money must reject a request with a missing account"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 64 - "Procedure"
Cohesion: 0.18
Nodes (10): 1. Understand the requirement first, 2. Build business knowledge with graphify and Serena (both mandatory), 3. Check the known-issue record, 4. Attack every bug, 5. Verdict per bug, Knowledge base: graphify, Output format (reply exactly in this shape), Procedure (+2 more)

### Community 65 - "Road to SDET Logo (React public)"
Cohesion: 1.00
Nodes (3): Road to SDET Logo (API uploads), Road to SDET Logo (React public), Road to SDET Brand Identity

### Community 66 - "SM-H01 Review: A request without from_account or to_account crashes the API"
Cohesion: 0.20
Nodes (9): Assessment, Fix in this PR, Issues, Out of scope (tracked separately), PR-level context, Requirement, SM-H01 Review: A request without from_account or to_account crashes the API, Strengths (+1 more)

### Community 67 - "SM-H02 Requirement Analysis: Daily transaction-count limit must hold under concurrent Send Money requests"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 69 - "SM-L01 Requirement Analysis: Send Money must reject non-numeric amount formats"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 70 - "playwright"
Cohesion: 0.40
Nodes (4): npx, jira, playwright, @playwright/mcp

### Community 71 - "SM-L02 Requirement Analysis: Send Money receipt "Total Amount" must include the service fee"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 74 - "SM-L02 Review: Receipt "Total Amount" excludes the service fee that was debited"
Cohesion: 0.20
Nodes (9): Assessment, Fix in this PR, Issues, Out of scope (tracked separately), PR-level context, Requirement, SM-L02 Review: Receipt "Total Amount" excludes the service fee that was debited, Strengths (+1 more)

### Community 75 - "SM-L03 Requirement Analysis: A non-string receiver must be a validation error, not an internal error"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 76 - "SM-L03 Review: A non-string receiver value fails with HTTP 500 and the raw internal validation message"
Cohesion: 0.20
Nodes (9): Assessment, Fix in this PR, Issues, Out of scope (tracked separately), PR-level context, Requirement, SM-L03 Review: A non-string receiver value fails with HTTP 500 and the raw internal validation message, Strengths (+1 more)

### Community 77 - "SM-M01 Requirement Analysis: Send Money must reject transfers to the sender's own account"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 78 - "SM-M01 Review: Sending to own account with a trailing space in the receiver number is accepted"
Cohesion: 0.20
Nodes (9): Assessment, Fix in this PR, Independent verification of the Important issue, Issues, PR-level context, Requirement, SM-M01 Review: Sending to own account with a trailing space in the receiver number is accepted, Strengths (+1 more)

### Community 79 - "SM-M02 Requirement Analysis: Send Money amounts must not have more than two decimal places"
Cohesion: 0.20
Nodes (9): 1. Summary, 2. Business Flow, 3. Scope, 4. System Impact, 5. Risks, 6. Gaps, 7. Edge Cases, 8. Acceptance Criteria (+1 more)

### Community 80 - "Two-step OTP login flow"
Cohesion: 0.29
Nodes (9): verifyOtp(), POST /user/login, Account status lifecycle (pending/active/suspended), Email notifications via Gmail API, Login page two-phase UI, Self-registration (Gmail-only, pending status), User Management Module (Admin-only CRUD), Users table data model (+1 more)

### Community 81 - "SM-H02 Review: Concurrent send-money requests exceed the daily transaction-count limit"
Cohesion: 0.22
Nodes (8): Assessment, Fix in this PR, Locking analysis, PR-level context, Requirement, SM-H02 Review: Concurrent send-money requests exceed the daily transaction-count limit, Strengths, Suggested verification

### Community 82 - "SM-L01 Review: Non-numeric amount forms such as "0x10", "1e1" and [20] are accepted"
Cohesion: 0.22
Nodes (8): Assessment, Fix in this PR, Issues, PR-level context, Requirement, SM-L01 Review: Non-numeric amount forms such as "0x10", "1e1" and [20] are accepted, Strengths, Suggested verification

### Community 83 - "profile/page.tsx"
Cohesion: 0.33
Nodes (6): Default User Avatar Placeholder, getPhotoUrl(), Profile(), ROLE_COLORS, STATUS_MAP, User

### Community 84 - "SM-M02 Review: Amounts with more than two decimal places are accepted and stored unrounded"
Cohesion: 0.22
Nodes (8): Assessment, Fix in this PR, Issues, PR-level context, Requirement, SM-M02 Review: Amounts with more than two decimal places are accepted and stored unrounded, Strengths, Suggested verification

### Community 86 - "users/page.tsx"
Cohesion: 0.47
Nodes (4): User, UserList(), Pagination(), PaginationProps

### Community 87 - "Test Result — PR-8"
Cohesion: 0.40
Nodes (4): Fixtures created, Results, Summary, Test Result — PR-8

### Community 88 - "Frontend role-based navigation menus"
Cohesion: 0.50
Nodes (4): Frontend role-based navigation menus, Role-Based Feature Access Matrix, User roles (Admin/Agent/Customer/Merchant/SYSTEM), ROLE_MENUS

### Community 89 - "Test Result — 03-deposit-test-cases (High priority)"
Cohesion: 0.50
Nodes (3): Results, Summary, Test Result — 03-deposit-test-cases (High priority)

### Community 90 - "Self-Statement with client-side date filter and running balance"
Cohesion: 0.50
Nodes (4): GET /transaction/statement, Self-Statement with client-side date filter and running balance, Transaction Inquiry Module, SelfStatement()

## Ambiguous Edges - Review These
- `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` → `X-AUTH-SECRET-KEY documented as only for user creation`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md · relation: conceptually_related_to
- `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` → `Separate security list items (BearerAuth OR XAuthSecretKey)`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/swaggerTrnx.yaml · relation: conceptually_related_to
- `GET /transaction/statement` → `Self-Statement with client-side date filter and running balance`  [AMBIGUOUS]
  dmoney-web-react/api_doc/API_ENDPOINTS.md · relation: conceptually_related_to
- `GET /user/uploads/:file` → `/user/uploads/:file documented as no authentication required`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md · relation: conceptually_related_to
- `dMoney MFS Platform` → `qa-agent Subagent (HRIS-scoped)`  [AMBIGUOUS]
  dmoney-transaction-api/.claude/agents/qa-agent.md · relation: conceptually_related_to
- `Next.js migration progress (~20%)` → `QUICK_START.md is stale`  [AMBIGUOUS]
  dmoney-web-react/QUICK_START.md · relation: conceptually_related_to

## Knowledge Gaps
- **718 isolated node(s):** `Inputs`, `1. Collect PR facts`, `2. Collect the requirements`, `3. Send the reviewer`, `4. Verify the findings (rule 3)` (+713 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 814 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` and `X-AUTH-SECRET-KEY documented as only for user creation`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` and `Separate security list items (BearerAuth OR XAuthSecretKey)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GET /transaction/statement` and `Self-Statement with client-side date filter and running balance`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GET /user/uploads/:file` and `/user/uploads/:file documented as no authentication required`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `dMoney MFS Platform` and `qa-agent Subagent (HRIS-scoped)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Next.js migration progress (~20%)` and `QUICK_START.md is stale`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `DMoney BRD (README.md)` connect `DMoney BRD (README.md)` to `CLAUDE.md (dmoney-web-react guidance)`, `Two-step OTP login flow`, `Frontend role-based navigation menus`, `Self-Statement with client-side date filter and running balance`, `user.route.js`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._