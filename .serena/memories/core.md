# r2sdet_AI — core

QA/SDET practice workspace ("Road to SDET"). Target app = **dMoney**, a bKash/Nagad-style mobile-money system. Not a single package: no root package.json; each subproject is installed/run independently.

## Source map
- `dmoney-transaction-api/` — backend (Express + Sequelize + MySQL). Details: `mem:api/core`.
- `dmoney-web-react/` — Next.js 15 frontend (repo root of this folder is the Next app). Details: `mem:web/core`.
  - `dmoney-web-react/dmoney-reactjs/` — legacy CRA version, reference only, not built.
- `sql_scripts/` — MySQL dump of `dmoneydb` (Windows export: lowercase table names; on Linux rename to `Users`, `Transactions`, `Commissions`, `Roles`, `TransactionLimits` before import — see root `README.md`).
- `class_notes/` — course notes (markdown + NotebookLM mind-map PNGs). Docs only.
- `graphify-out/` — committed graphify knowledge graph (`graph.json`, `GRAPH_REPORT.md`, cache). `graph.json` uses custom `merge=graphify` driver (`.gitattributes`); setup in `GRAPHIFY_SETUP.md`. Don't hand-edit.
- `.claude/skills/` (root) — workspace skills `blast-radius`, `understand-task`. Each subproject also has its own `.claude/` (agents/skills/hooks) copied from another repo (`hris-web-automation`); references to `testing_docs/`/Jira there may not apply.

## Project-wide invariants
- **Bugs and security flaws are intentional** (default JWT secret, OTP dev bypass, open CORS, IDOR, path traversal, etc.). Known issues documented in `dmoney-transaction-api/qa-findings/`. Never silently "fix" them; confirm whether a task is a fix task or a find/validate-bugs QA task.
- Business rules source of truth: BRD in `dmoney-web-react/README.md` (~1,400 lines). Endpoint source of truth: `dmoney-transaction-api/endpoints.md`.
- Each subproject has a detailed `CLAUDE.md`; read it before non-trivial work in that subproject.
- Ports: API 5000, frontend dev 3000 (`npm start` = 3006).

## Further memories
- Stack/versions: `mem:tech_stack`
- Run/dev/DB/graphify commands: `mem:suggested_commands`
- Code style & patterns for both subprojects: `mem:conventions`
- What to run before declaring a task done (no test runners exist): `mem:task_completion`
