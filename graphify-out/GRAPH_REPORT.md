# Graph Report - r2sdet_AI  (2026-10-07)

## Corpus Check
- 180 files · ~711,697 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .css 3, .example 2)

## Summary
- 1230 nodes · 2091 edges · 73 communities (67 shown, 6 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 180 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a6456ea`
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
- layout.tsx
- getBalance
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
- deposit.controller.js
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
- adminDeposit.controller.js
- hashPassword
- limitChecker.js
- sendMoney.controller.js
- Test Cases: Deposit / Cash-In
- cash-in-bank/page.tsx
- default.route.js
- Session Log — 2026-10-04
- Comprehensive Architecture & Workflow Guide: Agentic Software Testing with Claude AI
- create-next-app Boilerplate Assets
- server.js
- swagger.js
- scripts
- postcss.config.mjs
- Road to SDET Logo (gold RS monogram on black)
- Mastering AI Agents for Semantic Bug Discovery & Automation
- AI-Driven Quality Engineering: Project Setup, Knowledge Graphs & Change Impact Analysis
- Report — Blast Radius vs Graphify
- Report — Customer Transaction Limits
- payment.controller.js
- confirmCashIn
- Session Log — 2026-10-03
- Test Result — 03-deposit-test-cases
- Steps
- test-executor-agent.md
- login/page.tsx
- Low Priority
- Legacy CRA index.html
- Procedure
- Road to SDET Logo (React public)
- QUICK_START.md (stale Next.js migration guide)
- playwright
- graphify-prehook.sh
- profile/page.tsx
- SelfStatement.tsx

## God Nodes (most connected - your core abstractions)
1. `DMoney BRD (README.md)` - 41 edges
2. `DashboardLayout()` - 35 edges
3. `next` - 28 edges
4. `dmoney-transaction-api CLAUDE.md` - 28 edges
5. `test-design Skill` - 22 edges
6. `Endpoint Catalog (endpoints.md)` - 22 edges
7. `qa-agent Skill (Hermes)` - 21 edges
8. `{ Sequelize }` - 19 edges
9. `find-bug Skill` - 19 edges
10. `qa-agent-advocate Agent` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Admin Deposit to SYSTEM` --references--> `handleAdminDeposit()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/adminDeposit.controller.js
- `2. Serena: code relationships (mandatory)` --references--> `getBalance()`  [INFERRED]
  .claude/skills/find-bug/SKILL.md → dmoney-transaction-api/services/getBalance.js
- `Graphify results (run 2026-10-03)` --references--> `Withdraw()`  [INFERRED]
  dmoney-transaction-api/.artifacts/blast-radius-vs-graphify.report.md → dmoney-web-react/dmoney-reactjs/src/components/Withdraw.js
- `Bank Cash-In via Stripe` --references--> `confirmCashIn()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/stripeCashIn.controller.js
- `Bank Cash-In via Stripe` --references--> `createPaymentIntent()`  [INFERRED]
  dmoney-web-react/README.md → dmoney-transaction-api/controllers/transactions/stripeCashIn.controller.js

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

## Communities (73 total, 6 thin omitted)

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
Cohesion: 0.08
Nodes (15): fs, { hashPassword }, Joi, jwt, multer, path, { Roles }, { sendEmail } (+7 more)

### Community 8 - "dmoney-web-react/public/manifest.json"
Cohesion: 0.15
Nodes (12): background_color, categories, description, display, icons, lang, name, orientation (+4 more)

### Community 9 - "layout.tsx"
Cohesion: 0.24
Nodes (6): Hand-rolled PWA (sw.js, manifest, PWAProvider), PRECACHE_ASSETS, metadata, RootLayout(), BeforeInstallPromptEvent, PWAProvider()

### Community 10 - "getBalance"
Cohesion: 0.18
Nodes (6): 2. Serena: code relationships (mandatory), { getBalance }, getBalanceByAccount(), { Transactions }, { Users }, getBalance()

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
Cohesion: 0.11
Nodes (18): author, description, devDependencies, nodemon, nodemon, keywords, license, main (+10 more)

### Community 15 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, body-parser, cors, custom-env, dateformat, dotenv, express, googleapis (+11 more)

### Community 16 - "CLAUDE.md (dmoney-web-react guidance)"
Cohesion: 0.20
Nodes (8): CLAUDE.md (dmoney-web-react guidance), Env config (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SECRET_KEY, Stripe key), localStorage session keys, No lint script, ESLint config or test runner (use tsc --noEmit), Repo-local .claude QA tooling copied from hris-web-automation, token cookie (JWT, max-age from exp), clearSessionAndRedirect(), config

### Community 17 - "DMoney BRD (README.md)"
Cohesion: 0.06
Nodes (58): handleDeposit(), handlePayment(), handleWithdraw(), verifyOtp(), CASHIN-L07, DELETE /user/delete/{id}, GET /transaction/list (limit/offset), GET /transaction/statement (+50 more)

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
Cohesion: 0.15
Nodes (12): app, cors, defaultRoutes, express, morgan, swaggerUi, {swaggerUserDocument,swaggerTrnxDocument,}, transactionRoutes (+4 more)

### Community 25 - "deposit.controller.js"
Cohesion: 0.12
Nodes (16): { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }, seedTransaction (+8 more)

### Community 26 - "stripeCashIn.controller.js"
Cohesion: 0.20
Nodes (9): { Commission }, { getBalance }, Stripe, { Transactions }, { Users }, Commission, { DataTypes }, { sequelize } (+1 more)

### Community 27 - "withdraw.controller.js"
Cohesion: 0.22
Nodes (8): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users }

### Community 28 - "Bug Findings: Deposit / Cash-In"
Cohesion: 0.16
Nodes (17): Commission.getConfig(transaction_type), Deposit Two Flows (SYSTEM->Agent vs Agent->Customer), POST /transaction/stripe/create-intent, POST /transaction/deposit, Bug Findings: Deposit / Cash-In, [Improvement] Commission returned as raw float, [Deposit] Commission ledger row credit/debit reads like over-debit (Medium), [Security] create-intent no rate limit (Medium) (+9 more)

### Community 29 - "dmoney-reactjs/public/manifest.json"
Cohesion: 0.20
Nodes (11): Create React App Boilerplate Assets, React Default PWA Icon 192px, React Default PWA Icon 512px, background_color, display, icons, name, short_name (+3 more)

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

### Community 36 - "adminDeposit.controller.js"
Cohesion: 0.24
Nodes (8): { generateTrnxId }, handleAdminDeposit(), { sequelize }, { Transaction }, { Transactions }, { Users }, crypto, generateTrnxId()

### Community 37 - "hashPassword"
Cohesion: 0.27
Nodes (10): resetPassword(), createUser(), loginUser(), mailer(), partialUpdateUser(), registerUser(), updateUser(), validateRegistration() (+2 more)

### Community 38 - "limitChecker.js"
Cohesion: 0.15
Nodes (15): 4. Same target, both tools, Blast Radius result (worked example in the skill), Graphify results (run 2026-10-03), 6. Gaps and risks found, High Priority, SM-H01, SM-H02, checkCustomerLimits() (+7 more)

### Community 39 - "sendMoney.controller.js"
Cohesion: 0.12
Nodes (11): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, handleSendMoney(), sendMoney(), { sequelize }, { Transaction } (+3 more)

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

### Community 47 - "swagger.js"
Cohesion: 0.29
Nodes (5): fs, swaggerTrnxDocument, swaggerUserDocument, yaml, js-yaml

### Community 48 - "scripts"
Cohesion: 0.67
Nodes (3): scripts, dev, start

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
Cohesion: 0.14
Nodes (13): { checkCustomerLimits }, { Commission }, { generateTrnxId }, { getBalance }, { sequelize }, { Transaction }, { Transactions }, { Users } (+5 more)

### Community 56 - "confirmCashIn"
Cohesion: 0.09
Nodes (27): confirmCashIn(), createPaymentIntent(), findUserByIdentifier(), Cash-In Module Bugs, CASHIN-H01, CASHIN-H02, CASHIN-H03, CASHIN-H04 (+19 more)

### Community 57 - "Session Log — 2026-10-03"
Cohesion: 0.08
Nodes (24): 16:45 — First bug hunt, 16:47 — Save as a file, 16:50 — Rename, 16:51 — Were the tools used?, 17:33 — Asked again, more specifically, 17:51 — Spec for the skill (pasted), 17:57 — Run it on cash-in, 17:58 — Install agent-browser (separate session) (+16 more)

### Community 58 - "Test Result — 03-deposit-test-cases"
Cohesion: 0.50
Nodes (3): Results, Summary, Test Result — 03-deposit-test-cases

### Community 59 - "Steps"
Cohesion: 0.15
Nodes (12): 10. Reply to the user, 1. Scope and known issues, 3. graphify: domain knowledge (mandatory), 4. /blast-radius (mandatory), 5. Build candidates, 6. Reproduce: frontend first with agent-browser, 7. Fall back to API only when the UI can't reproduce, 8. Classify (+4 more)

### Community 61 - "login/page.tsx"
Cohesion: 0.13
Nodes (10): darkField, darkField, Login(), LoginContent(), darkField, darkSelect, roleInfo, darkField (+2 more)

### Community 62 - "Low Priority"
Cohesion: 0.18
Nodes (10): Low Priority, Medium Priority, Section 1: List of Bugs, Section 2: Summary, Send Money Bugs, SM-L01, SM-L02, SM-L03 (+2 more)

### Community 63 - "Legacy CRA index.html"
Cohesion: 0.40
Nodes (6): dmoney-reactjs legacy CRA app, Legacy CRA index.html, #root mount div, Legacy robots.txt, Legacy CRA README, Create React App scripts (start/test/build/eject)

### Community 64 - "Procedure"
Cohesion: 0.18
Nodes (10): 1. Understand the requirement first, 2. Build business knowledge with graphify and Serena (both mandatory), 3. Check the known-issue record, 4. Attack every bug, 5. Verdict per bug, Knowledge base: graphify, Output format (reply exactly in this shape), Procedure (+2 more)

### Community 65 - "Road to SDET Logo (React public)"
Cohesion: 1.00
Nodes (3): Road to SDET Logo (API uploads), Road to SDET Logo (React public), Road to SDET Brand Identity

### Community 66 - "QUICK_START.md (stale Next.js migration guide)"
Cohesion: 0.50
Nodes (3): QUICK_START.md (stale Next.js migration guide), Next.js migration progress (~20%), NEXTJS_MIGRATION.md (missing)

### Community 70 - "playwright"
Cohesion: 0.40
Nodes (4): npx, jira, playwright, @playwright/mcp

### Community 83 - "profile/page.tsx"
Cohesion: 0.33
Nodes (6): Default User Avatar Placeholder, getPhotoUrl(), Profile(), ROLE_COLORS, STATUS_MAP, User

### Community 86 - "SelfStatement.tsx"
Cohesion: 0.18
Nodes (6): User, UserList(), Pagination(), PaginationProps, SelfStatement(), Transaction

## Ambiguous Edges - Review These
- `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` → `X-AUTH-SECRET-KEY documented as only for user creation`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md · relation: conceptually_related_to
- `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` → `Separate security list items (BearerAuth OR XAuthSecretKey)`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/swaggerTrnx.yaml · relation: conceptually_related_to
- `Next.js migration progress (~20%)` → `QUICK_START.md is stale`  [AMBIGUOUS]
  dmoney-web-react/QUICK_START.md · relation: conceptually_related_to
- `GET /user/uploads/:file` → `/user/uploads/:file documented as no authentication required`  [AMBIGUOUS]
  dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md · relation: conceptually_related_to
- `dMoney MFS Platform` → `qa-agent Subagent (HRIS-scoped)`  [AMBIGUOUS]
  dmoney-transaction-api/.claude/agents/qa-agent.md · relation: conceptually_related_to
- `GET /transaction/statement` → `Self-Statement with client-side date filter and running balance`  [AMBIGUOUS]
  dmoney-web-react/api_doc/API_ENDPOINTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **542 isolated node(s):** `{ Transactions }`, `{ Users }`, `{ Commission }`, `{ getBalance }`, `{ checkCustomerLimits }` (+537 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 619 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` and `X-AUTH-SECRET-KEY documented as only for user creation`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `authenticateJWT middleware (JWT + X-AUTH-SECRET-KEY)` and `Separate security list items (BearerAuth OR XAuthSecretKey)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Next.js migration progress (~20%)` and `QUICK_START.md is stale`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GET /user/uploads/:file` and `/user/uploads/:file documented as no authentication required`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `dMoney MFS Platform` and `qa-agent Subagent (HRIS-scoped)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GET /transaction/statement` and `Self-Statement with client-side date filter and running balance`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `DMoney BRD (README.md)` connect `DMoney BRD (README.md)` to `CLAUDE.md (dmoney-web-react guidance)`, `user.route.js`, `sendMoney.controller.js`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._