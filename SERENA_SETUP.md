# Serena Setup

[Serena](https://github.com/oraios/serena) gives Claude Code language-server tools for this workspace: symbol search, find references, rename, symbol-level edits and project memories. Follow these steps to set it up.

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [Claude Code](https://claude.com/claude-code)

## Steps

### 1. Install uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$HOME/.local/bin" sh
```

If VS Code is installed as a snap, running this from its terminal can put uv in `~/snap/code/<version>/.local/bin` and point `~/.bashrc` / `~/.profile` there. `UV_INSTALL_DIR` forces `~/.local/bin`. Check with `which uv uvx`.

### 2. Install the Claude Code plugin

```bash
claude plugin install serena@claude-plugins-official
```

Restart Claude Code (or reload the VS Code window), then run `/mcp` to confirm `serena` is connected. The plugin's tools are named `mcp__plugin_serena_serena__*`.

### 3. Install the Serena CLI

```bash
uv tool install git+https://github.com/oraios/serena
```

This provides `serena` and `serena-hooks` in `~/.local/bin`.

### 4. Create the global config

```bash
serena init
```

### 5. Register and index the project

```bash
cd r2sdet_AI
serena project create --ls typescript --index .
```

This writes `.serena/project.yml` and indexes the JS/TS/TSX files. Only the TypeScript language server is needed; it covers the JavaScript API too. Do not enable Vue, because the repo has no Vue files.

### 6. Add the Claude Code hooks

`serena setup claude-code` registers a second, user-scope `serena` MCP server and the hooks. The plugin already provides the server, so remove the duplicate and keep only the hooks:

```bash
serena setup claude-code
claude mcp remove serena -s user
```

`~/.claude/settings.json` should then contain these hooks (back up the file first):

| Event | Command |
|-------|---------|
| `SessionStart` | `~/.local/bin/serena-hooks activate --client=claude-code` |
| `PreToolUse` | `~/.local/bin/serena-hooks auto-approve --client=claude-code` |
| `PreToolUse` | `~/.local/bin/serena-hooks remind --client=claude-code` |
| `SessionEnd` | `~/.local/bin/serena-hooks cleanup --client=claude-code` |

### 7. Onboard the project

In Claude Code, ask: `serena init` (runs Serena onboarding). It writes memories to `.serena/memories/`:

| Memory | Contents |
|--------|----------|
| `core` | Entry point: source map, intentional-bugs rule, source-of-truth docs, ports |
| `api/core` | API request flow, auth middlewares, ledger model, locking pattern, env quirks |
| `web/core` | Next.js layout, 3-file auth sync, UI-only role gating |
| `tech_stack` | Versions and libraries per subproject |
| `conventions` | Code style for API, web and repo |
| `suggested_commands` | Run, dev, DB and graphify commands |
| `task_completion` | Manual checks before a task is done (no test runners exist) |
| `memory_maintenance` | How to structure and update memories |

### 8. Register the subprojects (optional)

In Claude Code, ask: `activate serena inside @dmoney-transaction-api/`, then the same for `@dmoney-web-react/`. Each gets its own `.serena/` folder. Serena works on one project at a time, so switch back by activating the root again.

Neither subproject has been onboarded yet, so they have no memories.

### 9. Commit the config

`.serena/.gitignore` already excludes `cache/` and `project.local.yml`.

```bash
git add .serena dmoney-transaction-api/.serena dmoney-web-react/.serena
git commit -m "chore: add serena project config and memories"
git push
```

## Everyday use

- Open the dashboard: ask Claude to "open serena dashboard" (served on `http://127.0.0.1:2428x/dashboard/`).
- Each Claude session starts its own Serena server. If several are running on the same project, stop the old ones.
- After notable structural changes, update the memories via Serena's memory tools rather than hand-editing.

## Work log since installing Serena (2026-10-03)

| Time | Request | Result |
|------|---------|--------|
| 01:33 | Install Serena plugin | Plugin installed; uv 0.12.22 installed to `~/.local/bin`; snap-path lines in shell profiles fixed |
| 01:44 | Init Serena | Global config created; root project registered with TypeScript LS; 96 files indexed |
| 01:48 | Serena onboarding | 8 memories written to `.serena/memories/` |
| 01:59 | `serena setup claude-code` | CLI 2.0.0.dev0 installed; duplicate MCP server removed; 4 hooks added (backup: `~/.claude/settings.json.bak-serena`) |
| 01:54–02:06 | Check access, open dashboard | Serena connected (29 tools); dashboard opened |
| 02:08–02:11 | Activate Serena in subprojects | `dmoney-transaction-api/.serena/` and `dmoney-web-react/.serena/` created |
| 02:17–02:22 | Blast radius vs graphify | Discussion only, no files changed |
| 02:32–02:38 | Create test-charter skill | `.claude/skills/test-charter/SKILL.md` |
| 02:44 | `/test-charter` for deposit/cash-in | `dmoney-transaction-api/qa-findings/05-deposit-test-charters.md`: 6 charters (CH-1 to CH-6) + session report template |
| 02:49–02:55 | Create test-design skill | `.claude/skills/test-design/SKILL.md` (Requirement Highlights / Test Cases / Prioritized Titles) |
| 03:00 | `/test-design` for deposit/cash-in | `dmoney-transaction-api/qa-findings/06-deposit-cash-in-test-design.md`: R-1 to R-17, 64 test cases, prioritized High / Mid / Low |

The charters and test cases are designed from the code and have not been run yet.
