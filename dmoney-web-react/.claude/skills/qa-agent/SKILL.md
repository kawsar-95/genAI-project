---
name: qa-agent
description: "Analyze a ticket into tests, findings, and review."
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [qa, sdet, orchestration, test-design, bug-hunting]
    related_skills: [analyze-requirement, explain-code, find-bug, test-design, analyze-rootcause, validate-bug, qa-agent-advocate]
---

# QA Agent (Hermes)

Senior QA driver: analyze a Jira ticket or task into acceptance criteria, hunt for high-probability bugs, design sanity test cases, and route the deliverables through adversarial review. The full procedure is Steps 0–8 below; the wrapper sections above (`When to Use`, `Prerequisites`, etc.) frame it for the Hermes skill loader.

This skill is the inline equivalent of the Claude Code `qa-agent` sub-agent — same SOP, same three-file output, same evidence discipline, but the mechanics (file I/O, DB queries, spawning the advocate) are translated to Hermes tools (`write_file`, `terminal`, `skill_view`).

## When to Use

- A user gives a Jira ticket key, requirement, commit hash, file path, or task and asks for QA analysis
- "Write test cases for DEV-1234" / "find bugs in this branch" / "analyze this requirement"
- After `analyze-requirement`, `explain-code`, or `find-bug` has produced partial output and the user wants the full pipeline stitched together
- Driving an end-to-end QA pass: requirements → bugs → tests → adversarial review

**Don't use for:** pure code explanation (use `explain-code`), debugging a single failing test trace (use `analyze-rootcause`), validating a specific bug with the 3-layer proof framework (use `validate-bug`), or just brainstorming tests without a target (use `test-design` directly).

## Prerequisites

- A target to work on: a Jira ticket key, requirement text, commit hash, file path, or named endpoint/module. If none, ask before proceeding.
- For ticket work: read access to the codebase. For bug hunting: the code must be present somewhere (working tree, unmerged ref, or as live state).
- For live DB verification: `mysql` / `psql` / `sqlite3` CLI in `PATH`, plus read-only credentials the user supplies at runtime. **Read-only discipline is non-negotiable** — never write to a database during QA work.
- **The adversarial review skill `qa-agent-advocate` must be available** (already installed in `~/.hermes/skills/software-development/`) — without it, no finding or test set gets presented as confirmed. Same caveat applies as in `find-bug` and `validate-bug`.
- **The companion skills** (`analyze-requirement`, `explain-code`, `find-bug`, `test-design`, `analyze-rootcause`, `validate-bug`) must also be present — this skill orchestrates them. They are all installed in `~/.hermes/skills/software-development/` from earlier in this session.

## How to Run

Use this skill inside any Hermes session by referencing it (`skill_view(name='qa-agent')` first if uncertain). Follow Steps 0–8 below in order. Read each companion skill's SKILL.md before invoking its procedure (Step 3).

The output lands in `testing_docs/<KEY>.test.md` + `<KEY>.bug.md` + `<KEY>.review.md` when a Jira ticket is given, or in the reply otherwise — same three-file contract as the Claude Code version.

## Quick Reference

- **Output target** — `testing_docs/<KEY>.test.md` (cases), `<KEY>.bug.md` (findings), `<KEY>.review.md` (evidence + advocate verdicts). Without a ticket: deliver in the reply.
- **Pipeline order** — `analyze-requirement` → `explore`/understand → pin down test data → `find-bug` (when asked) → `test-design` → spawn `qa-agent-advocate` → present.
- **Bug hunt is deferred by default** for a plain test-case ask. See Job 4 in the orchestrating pattern below.
- **Tools translation** — `Read` → `read_file`; `Bash` (grep/rg/git) → `search_files` + `terminal`; `Bash` (file write) → `write_file`; `mcp__db-mcp__execute_query` → `terminal mysql -e "..."` (read-only); `mcp__jira-mcp__get_jira_ticket` → user pastes ticket, or `terminal curl` against Jira REST with user-supplied token.
- **Read-only DB discipline** — `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN` only. Never `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`. If a case needs data that doesn't exist, say what to create and let the user create it.
- **Credentials never enter a file** — `testing_docs/` is committed; write accounts as role + email, never passwords or tokens.
- **No git writes** — this skill reads git freely (`status`, `log`, `diff`, `show`, `branch --show-current`, `rev-parse`) but never `add`/`commit`/`push`/`pull`/`merge`/`rebase`/`reset`/`stash`/`tag`. Output files are written but uncommitted.

---

# QA Agent SOP (Steps 0–8)

## Step 0 — Project policy

Read whatever project memory is available before analyzing anything:

- If the user is working in a project that exposes memory (e.g. `MEMORY.md` in a project memory directory), read it first — it records prior lessons, false-positive patterns, settled decisions, and format corrections. Resolve the path yourself rather than assuming one.
- If no project memory is reachable, carry on. The companion skills' SKILL.md files are the complete specification. Note once in your output that no project memory was found, and never invent a "prior lesson" to justify a decision.
- Treat recorded memories as background true when written — if a memory names a file, field, or rule, confirm it still exists before relying on it.

### When the advocate is involved

The trigger is **what you are producing**, not whether a ticket exists. Three deliverables always get an adversarial review:

- Test cases or a test design
- Acceptance criteria
- Bug findings, including security findings

Nothing else does. An explanation of code, a root-cause analysis, a requirement summary, or a plain question goes straight to the user — no advocate, no review. The Challenge Protocol exists to catch false-positive defects and low-value test cases; an explanation has no equivalent failure mode.

**In Hermes, you invoke the advocate manually** (Claude Code uses a hook; here you use `skill_view(name='qa-agent-advocate')` after delivery, with the appropriate mode passed in your prompt). End with an explicit handoff line naming the review needed — `Bug Review Mode` for findings, `Test Case Review Mode` for cases or acceptance criteria. Label every finding a first-pass hypothesis awaiting adversarial review, because from where you sit it always is: you will never see the verdict yourself.

Mode changes only where the verdicts land: with a ticket they are recorded in the review file by the advocate; without one they are folded into your reply — a rejected candidate is dropped or downgraded there, not quietly kept.

If a request mixes kinds — "explain this ticket, then write test cases for it" — the review covers the test cases only, and the explanation goes straight to the user.

## Step 1 — Classify the task

| Case | Trigger | Work |
|---|---|---|
| 1 | Jira ticket id or a requirement | requirement analysis |
| 1-AC | "write acceptance criteria", "what are the AC", or a ticket with none and testing is being asked for | requirement analysis, ending in acceptance criteria |
| 2a | File path or symbol + bug-hunting intent ("find bugs", "review", "check for issues") | bug hunting |
| 2b | File path or symbol + understanding intent ("explain", "how does X work") | code explanation |
| 3 | "latest changes", "current commit", "HEAD", or nothing specific | work from `git show HEAD` (via `terminal`) |
| 4 | Log snippet, error, "why is this failing" | root-cause analysis |
| 5 | "security review", "vulnerability", "is this exploitable" | security-focused bug hunt |

## Step 1b — Decide the output mode

Before any work, settle where the output goes. Two modes, decided by whether a Jira ticket was given.

**Files mode** — a ticket was given. Write the three files per Step 7, using the ticket key verbatim as the filename stem — `DEV-2951.test.md`, `DEV-2951.bug.md`, `DEV-2951.review.md`. Two of them (test + review) when Step 1c establishes the implementation is not checked out.

**Chat mode** — no ticket. Triggered by pasted feature description, "write test cases for this module", "find some bugs here, the code is at …", a file path, or a commit with no ticket attached.

In chat mode:

- Follow the same skill rules that govern the files. A test case still carries nine fields and stays non-technical; a bug still carries the `find-bug` fields with black-box reproduction steps. The format does not relax because the destination changed.
- **The adversarial review still runs.** Invoke `qa-agent-advocate` against your chat output exactly as you would against a ticket's, and apply its verdicts before replying — drop what it rejects, downgrade what it weakens. Skip only the review *file*: no `.review.md`, no evidence map, no written argument. Say in one line that the output was advocate-reviewed.
- Be to the point. No feature-summary preamble unless it is what was asked for, no coverage tables, no evidence maps, no "what I did" narration.
- Answer only what was asked. "Write test cases" means test cases — do not volunteer bug findings. "Find bugs" means findings — do not volunteer a test-case set.

If a ticket is mentioned but you cannot fetch it, stay in chat mode and say the ticket was unavailable. Never create files named after a ticket you never read.

## Step 1c — Where is the ticket's code, and can you run it?

Test cases and bug findings do not need the same thing. A test case comes from the requirement — it can be written before a line of code exists, and often should be. A bug finding comes from the code, and from the code *as it will actually ship*.

So on any ticket, before writing anything, establish **where the implementation is**. Check yourself first, all read-only via `terminal`:

```bash
git branch --show-current
git log --oneline -8
git log --oneline --grep='<KEY>' | head            # reachable from HEAD?
git log --all --oneline --grep='<KEY>' | head      # anywhere at all?
git branch -a --contains <sha>                     # which refs carry it
```

### The three states

| State | What is true | What you may do |
|---|---|---|
| **A — present** | a commit reachable from `HEAD` carries the key and contains real work | full run: read, review, reproduce, hunt bugs |
| **B — elsewhere but readable** | the work exists on another ref — an unmerged commit, a local or remote branch — and `git show <ref>:<path>` reads it without checking anything out | read and cite the code; **cannot execute or reproduce** |
| **C — does not exist** | no commit anywhere implements it; at most a branch was cut | requirement only |

Two traps: a branch *name* carrying the key proves nothing (a branch can be cut and never worked on, or its work force-pushed away). Confirm a commit on it actually implements something. Name-only is state C. When you cannot tell, ask rather than guess.

### Always ask — whatever the deliverable

**In states B and C, stop and ask before writing anything.** This holds for a test-case request exactly as much as for a bug hunt. Make it your final answer and stop, batched with the Step 5d test-data request so one reply answers everything:

```markdown
## Before I write these

Where this ticket's code is, as far as I can see:

Current branch: `<branch>`. HEAD: `<subject line>`.
`<KEY>` is not reachable from HEAD. I found it as `<sha>` on `<ref>`.

1. **I am on the right branch** — your check is wrong. I re-verify and run in full.
2. **I will switch to it.** I stop here and write nothing. Switch whenever ready, then tell me and I start over. No rush, no timeout.
3. **Read it where it is, without switching.** I read `<ref>` read-only and design from the real implementation, but nothing is executable here, and the branch may still change before it merges — every code-derived expectation is labelled with that.
4. **Treat it as not built.** I design from the ticket alone and ignore the branch.
```

In state C, drop options 1 and 3. Do not push toward any option; each is a legitimate choice.

### Unmerged-code mode (state B, option 3)

You have full evidence and no ability to run it, so the constraint is executability, **not** evidence:

- Read the implementation properly: `terminal` with `git show <ref>:<path>` for each file, `git show <sha>` for the diff. Everything the test-design SOP asks for is available to you here.
- White-box cases are available (unlike in tests-first mode).
- Label every code-derived fact with the ref and short sha, and say plainly that it is not confirmed to ship.
- Nothing is executable. State that in the header: these cases cannot be run in this tree.
- Bug findings are permitted but never confirmed. With unmerged ref in `Environment` and `NEEDS LIVE VERIFICATION` on each. The advocate may not confirm any of them.

### Whether it can be run at all — check before promising executable cases

Presence in the tree is not runnability. Check the two things that most often break it, read-only:

```bash
git show <ref>:package.json | head -60          # what the change expects
```

- **Dependency versions.** If the commit bumps a dependency, compare it with what is installed (`terminal` with `node -p "require('<pkg>/package.json').version"` or read `node_modules/<pkg>/package.json`). A branch requiring a package version that is not installed cannot run even after a checkout.
- **Unapplied migrations.** If the change adds a migration, confirm the column or table actually exists in the live database before writing a case that depends on it. A migration file is intent, not deployed state.

Where either fails, write it as a stated precondition of the affected cases.

### One rule no mode switches off

**Noticing a likely defect always routes to `find-bug`.** Whatever state the code is in, if something looks wrong while you are designing cases: record it, keep designing, and hand it to `find-bug` — with the state's own constraint attached. What you must not do is let a mode's framing silently swallow an observation. If a bug file is not being written, the observation still goes into the review file's bug-candidate section with the argument on both sides, and your output says it is there.

### Verify the switch actually happened

Run this whenever someone tells you the code is there. `fetch` and `rev-list` read only — nothing is merged, pulled, or reset:

```bash
git branch --show-current
git log --oneline -5
git log --oneline --grep='<KEY>' | head
git status --short | head
git fetch --quiet && git rev-list --left-right --count HEAD...@{upstream}
git log --oneline @{upstream}..HEAD
git log --oneline HEAD..@{upstream}
```

Then read the result for these specific failure modes:

- **Still on the old branch.** Say what branch you are on and what you expected, and ask again.
- **Branch name carries the key, but no commit does.** Treat as option 3 — nothing to review.
- **Behind the remote.** Report how many commits behind, name the branch, ask them to bring it up to date before review.
- **Ahead of the remote, or dirty.** Uncommitted or unpushed work means you are reviewing something no one else can see. State so.
- **Both ahead and behind — diverged.** State it and stop.
- **Key reachable from `HEAD` but the branch is `develop`/`main`.** The work has merged. Valid — review it, and say you reviewed the merged state.

Record what you verified — branch, HEAD subject, sync position — at the top of the bug file and in the review file.

**Never assume the switch happened because you asked for it.** The single most expensive failure in this whole flow is a full bug pass against the baseline that reports "no issues found."

### Tests-first mode (state C, option 4)

Write **two** files, not three:

| File | Written? |
|---|---|
| `<KEY>.test.md` | yes — from the ticket alone |
| `<KEY>.bug.md` | **no** — say in your output that you did not write one, and why |
| `<KEY>.review.md` | yes — the advocate still reviews the cases; its bug-argument section records that no bug pass ran |

And hold to these:

- **Leave the `Any Issue?` line out of every case.** Not `Yes`, not `No`, not `N/A` — the field does not appear at all. Cases carry eight fields, and the header note says once that the field is absent because there is nothing to run a bug pass against yet.

  | Code exists? | Bug pass ran? | `Any Issue?` |
  |---|---|---|
  | no (tests-first / state C) | n/a — nothing to hunt in | **omitted entirely**, eight fields |
  | yes | not yet — a test-case-only ask deferred it | **`N/A — bug hunt not yet run`**, on every case uniformly, nine fields |
  | yes (or unmerged, state B) | yes | **`No`**, or **`Yes — [<KEY>.bug.md](<KEY>.bug.md)`**; in state B, findings additionally marked `NEEDS LIVE VERIFICATION` |

- **No white-box section, and no coverage-summary claim about the diff.** Both are derived from the implementation.
- **Test data still has to be real where it can be.** Resolve every identifier you can from the live DB.
- **Where the record cannot exist yet, describe it instead of inventing it.** `TBD — record does not exist until the feature is deployed`.
- **Expected results come from the requirement, and say so.** Where the ticket is silent, the case says `TBD — not established by the requirement`.
- **Say at the top of the document that it was written before the implementation was available**, name the branch and commit you were on.

When they later switch to the feature branch and re-run, the bug pass runs then and `<KEY>.bug.md` is written then — the existing test document is revised, not replaced.

## Step 2 — Fetch the real input first

| Case | Action |
|---|---|
| 1 | Fetch the Jira ticket. In Hermes: either ask the user to paste it, or use `terminal` with `curl` against the Jira REST API using a token they supply at runtime. Document the request. |
| 2a/2b | `read_file` the file, or find the symbol with `search_files` then `read_file` its implementation |
| 3 | Find the right `.git` root under the working directory (`terminal`), then `terminal` with `git show HEAD` |
| 4 | Read the log, then query the DB if state matters |
| 5 | `read_file` and `search_files` for the relevant code path |

Report nothing until this step returned real content. Deployed state is not repository state — query the live DB or read the installed library source when a conclusion depends on it.

### When the ticket or the database is not reachable

Neither integration is guaranteed. A copied `.claude`/`.hermes` folder, a different machine, or a colleague whose servers are registered under other names will have one or both missing.

**No ticket access.** If the Jira fetch fails, do not proceed on the key alone. Ask for the ticket text to be pasted. If it is pasted, treat it as the requirement and keep the key for filenames (Files mode still applies). If not, stay in chat mode and say the ticket was unavailable.

**No database access.** Say so once, then work without it:

- Never substitute migrations, models, repository methods, or schema files for a live query. That inversion is the single most repeated false-positive source: repository files describe intent, the database holds truth.
- Any expectation resting on schema shape, column nullability, stored values, or row state is unverified. Write `TBD — not established by available evidence` on the affected line, or mark the finding `NEEDS LIVE VERIFICATION` — never assert it.
- Test data cannot be resolved by query, so more of it has to be asked for. Go to Step 5d earlier.
- A finding whose only evidence would have been database state does not get filed.

Losing an integration narrows what you can conclude. It never lowers the evidence bar for what you do conclude.

### Or query the user's local database directly

Ask for host and port, database name, username, password, and **explicit confirmation that this is a local development database**.

Then hold to these, without exception:

- **Read-only.** `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN` only. Never `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`.
- **Local only.** Never query production. If they hand you production details, ask for a local database or a dump instead.
- **Prefer a read-only account.**
- **Keep the password out of everything.** Use `MYSQL_PWD` in the command's environment over inline `-p<password>`. Refer to it afterwards as "the local database credentials supplied at run time".
- **The password is not test data.** A case that needs a login uses an application account, written as role plus email.

What to use it for: confirm the identifier exists and is in the state a precondition needs; read actual column types and nullability; follow foreign keys to find which records and which flows a change touches; pick concrete rows so two testers run the same case against the same data.

**The route never changes the output contract.** However the evidence arrived, the test cases still follow `test-design` and the findings still follow `find-bug`.

## Step 3 — Read the skill file before running that skill

Use the local `.claude/skills/` or `.hermes/skills/` copy, not a stale global default. The local copy is the one kept current with the project's lessons learned.

| Skill | File |
|---|---|
| analyze-requirement | `~/.hermes/skills/software-development/analyze-requirement/SKILL.md` |
| find-bug | `~/.hermes/skills/software-development/find-bug/SKILL.md` |
| test-design | `~/.hermes/skills/software-development/test-design/SKILL.md` |
| explain-code | `~/.hermes/skills/software-development/explain-code/SKILL.md` |
| analyze-rootcause | `~/.hermes/skills/software-development/analyze-rootcause/SKILL.md` |
| validate-bug | `~/.hermes/skills/software-development/validate-bug/SKILL.md` |
| qa-agent-advocate | `~/.hermes/skills/software-development/qa-agent-advocate/SKILL.md` |

Load each skill with `skill_view(name=...)` and follow its output format rather than inventing one.

## Step 4 — Understand it in business language before testing it

Before running `find-bug` or `test-design`, write a plain-language account of the feature: purpose, who uses it, what triggers it, preconditions, the business steps, the rules enforced, what the user sees, what gets recorded, what happens on failure, what it connects to, and anything the requirement leaves unanswered.

Required for cases 1, 2a, 3 and 5. Not for 2b or 4, which have their own formats.

It must contain no file paths, function or class names, table or column names, SQL, endpoint paths, status codes, payload field names, code snippets, config keys, or framework terminology. Write it for a product owner who has never seen the codebase, in the vocabulary the business uses.

**This is a gate.** If you cannot write it from the evidence fetched in Step 2, you do not understand the feature yet. Fetch more; do not proceed.

Where it goes: `test-design` opens its document with a Feature Summary built from exactly this understanding — use that skill's field list and keep it short.

## Step 5 — Pin down real test data before writing anything

### 5a. Derive what each case and each reproduction actually needs

From the understanding in Step 4, list the concrete inputs required — business identifiers, the account and role each step runs as, and any state a record must already be in.

### 5b. Mine the ticket before asking for anything

The ticket usually already carries half the data. Re-read what Step 2 fetched and harvest every concrete value in it: account emails, phone numbers, queue names, serials, codes, amounts, dates, environment hints, named people and teams, and any value quoted in a reported bug. Those are the business's own test data — use them in preference to anything you would pick yourself.

### 5c. Find the rest in the database

When you have read-only DB access, use it rather than asking. Query for records that already satisfy each precondition.

### 5d. Ask for what is left — by ending your turn with the request

Whatever the ticket and the database could not settle, you must ask for. Make every question specific to this ticket. Format it so one reply answers everything, and deliver whatever does not depend on the missing data alongside it:

```markdown
## Test data needed before I can write these cases

- [item] — needed by: [which cases], must be: [required state]

Blocked until answered: [case ids or areas]. Everything else below is complete.
```

### 5e. Verify what you are given, then use it

Every value handed back gets checked against the database before it goes into a case — an id that does not exist, or that is in the wrong state, produces a case that fails for the wrong reason.

### 5f. Credentials never enter a file

Never write a password, token, session cookie, API key, database credential, or any other secret into a `testing_docs/` file — or into any other file, script, or note — and never echo one back in your output. Write the account as its role and email.

Until the data arrives, write `TBD — not established by available evidence` in the affected Test Data or Preconditions line. Never fill the gap with a plausible-looking id.

## Step 6 — Run the skills in order

**`find-bug` is never bundled into a test-case ask by default.** "Write test cases" means test cases — the same rule chat mode already states at Step 1b applies in Files mode too. Run `find-bug` only when the task explicitly asked for bug-hunting (Case 2a/3/5), or when you were separately re-invoked to run it after a test-case run already completed.

- Case 1, test cases asked for: `analyze-requirement` → understand (Step 4) → pin down test data (Step 5) → `test-design`. No `find-bug`.
- Case 1, bug-hunt explicitly asked for: `analyze-requirement` → understand → pin down test data → `find-bug` → `test-design`. Skip `find-bug` when Step 1c established the implementation is not in the working tree.
- Case 1-AC: `analyze-requirement`, carried through to its Acceptance Criteria section. Criteria are reviewed like any other deliverable and returned in the reply. If test cases were also asked for, write the criteria first and derive each case from an `AC-n`.
- Case 2a: understand → `find-bug` → `test-design`
- Case 2b: `explain-code`
- Case 3: understand → `find-bug` on the diff only → `test-design` only if behavior changed
- Case 4: `analyze-rootcause`
- Case 5: understand → `find-bug`, security-focused, with a concrete attack path per finding

**What the user asked for decides what gets written:**

| The ask | With a ticket (Files mode) | Without a ticket (Chat mode) |
|---|---|---|
| "write test cases", "design tests", "sanity tests" | `<KEY>.test.md` + `<KEY>.review.md` — **no `<KEY>.bug.md`** | test cases in the reply, nothing else |
| "find bugs", "review this", "security review" | `<KEY>.bug.md` + `<KEY>.review.md` — **no test-case file** | findings in the reply, unreviewed, no files |
| "write acceptance criteria" | none — criteria go in the reply for pasting into the ticket | same |
| "explain", "why is this failing" | none — output only | none — output only |

### Handoff: offering the bug pass after test cases are delivered

When you completed a test-case-only run, every case in `<KEY>.test.md` carries `**Any Issue?:** N/A — bug hunt not yet run`. End your final reply with this exact line:

```
Bug hunt not run — this was a test-case-only request. Want me to run find-bug on <KEY> now? (yes/no)
```

The user answers in a fresh message. Do not pre-emptively write `<KEY>.bug.md` in anticipation, and do not treat silence as either answer.

### When you are re-invoked later to run the deferred bug pass

1. Re-read `<KEY>.test.md` and `<KEY>.review.md` first.
2. Run `find-bug` as normal and reach your findings.
3. **Update every `Any Issue?` line in `<KEY>.test.md`** from `N/A — bug hunt not yet run` to `No`, or to `Yes — [<KEY>.bug.md](<KEY>.bug.md)`. Use `read_file` to load the current content, modify the lines, then `write_file` to emit the whole file back. **Do not add a revision note, an advocate-revision paragraph, or a find-bug pass summary above Feature Summary** — that material goes in `<KEY>.review.md`. Verify the rewrite afterward.
4. Write `<KEY>.bug.md` per Step 7, and append your bug-candidate section and the E6/E7 material to the existing `<KEY>.review.md` rather than starting a fresh one.
5. Say plainly, once, that the test-case document's `Any Issue?` lines were just updated from `N/A`.

## Step 7 — Write the output files

### Where `testing_docs/` is, and creating it

1. An existing `testing_docs/` directory in the working directory, or in a parent of it — reuse it.
2. Otherwise, create `testing_docs/` in the repository root you are working in.

Use `write_file` to create the directory's contents and each file. After every `write_file`, verify the file exists with `terminal` with `ls -la` and `wc -l`.

### Filenames come from the ticket key you were given

The stem is the **actual Jira key**, verbatim — `DEV-2951`, `TASK-5`, `PROJ-123`. There is no fixed project prefix.

| File | Holds | Owner |
|---|---|---|
| `<KEY>.test.md` | test cases only | `test-design` Part D |
| `<KEY>.bug.md` | bug findings only | `find-bug` |
| `<KEY>.review.md` | evidence map, gaps, assumptions, bug arguments, advocate verdicts | `test-design` Part E |

For `TASK-5` that is `TASK-5.test.md`, `TASK-5.bug.md`, `TASK-5.review.md`. If the ticket came from a branch name, use the key inside it, not the branch.

### Write all three yourself

There is no helper to delegate to. Write each file with `write_file`, in this order, and verify each before moving on:

1. `<KEY>.test.md` — test cases.
2. `<KEY>.bug.md` — findings, **only when a bug pass actually ran this turn**. Skip when this was a test-case-only ask, and in tests-first mode.
3. `<KEY>.review.md` — evidence map, gaps, assumptions, caller trace, exclusions, bug-candidate arguments. Leave the review-outcome section as `Not yet reviewed`; the advocate fills it in after you finish.

### Rules that follow from the split

- `<KEY>.test.md` carries exactly seven sections, in order: §1 Feature Summary, §2 Acceptance Criteria, §3 Basic Test, §4 System Behavior Tests (4a New + 4b Related), §5 White-box Tests, §6 Coverage Summary, §7 Top Test Cases.
- No eighth section, no ad-hoc heading, nothing at all between the title's link lines and `## 1. Feature Summary`.
- The Basic Test section obeys the exact same non-technical rule as the rest of the document.
- The acceptance criteria come from `analyze-requirement`'s standard and say whether the ticket stated them or you derived them.
- `<KEY>.test.md` carries no bug write-up, no severity, no evidence citations. A case whose behavior has a suspected defect says so on its `Any Issue?` line and links the bug file.
- If a `<KEY>.review.md` already exists, read it before revising anything.
- **Directly under the title, the link line and nothing else.** No revision narrative before Feature Summary.

## Step 8 — Know when you are done, and when to stop early

### Done

In Files mode, the work is complete when every affected acceptance criterion is covered, high-risk scenarios and the required roles are exercised, the API and database checks that matter are done, related regression is covered, each finding carries evidence and has survived advocate review, and anything blocked or unexecuted is listed. In chat mode it is complete when the specific thing asked for is delivered, its uncertainties are labelled, and the advocate has reviewed it.

### Stop early, and say why

Stop and record the reason when the wrong build is deployed, the environment is too unstable for results to mean anything, credentials or critical test data cannot be obtained, the acceptance criteria contradict each other materially, a blocking defect prevents going further, or continuing would modify production data without authorization.

Stopping is not abandoning. Finish every part that is still valid, then state plainly what is blocked, why, and which cases remain unexecuted.

### Reporting results into Jira

When asked to post results to the ticket, keep the comment short — one line per case, with a bug reference on failures.

## Orchestration pattern (Hermes-specific)

In Claude Code, the `/qa-agent` slash command handles Jobs 1–4 (relay questions, re-invoke, spawn advocate, offer bug hunt). In Hermes, the *user-facing session* (you, the main agent) plays that role. The pattern is:

1. **Receive the user's task.** Load this skill.
2. **Run Steps 0–8 yourself** (or delegate a bounded subtask via `delegate_task` if the work is genuinely parallelizable — but the SOP usually requires sequential context).
3. **When the SOP produces a question for the user** (Step 5d test-data request, Step 1c branch/data request), end your turn with that question. The user replies in a fresh message. You resume from where you stopped, re-running only the parts that depend on the answer.
4. **When you finish a test-case or bug-finding deliverable,** explicitly invoke `skill_view(name='qa-agent-advocate')` and prompt it to run in `Test Case Review Mode` or `Bug Review Mode` as appropriate. Wait for its verdict, then fold the verdict into your reply (chat mode) or write it into `<KEY>.review.md` (files mode).
5. **When a test-case-only run ends,** present the reviewed cases to the user and end with the `Bug hunt not run — ... (yes/no)` line. The user answers in a fresh message. On `yes`, re-invoke the bug pass per Step 6's "When you are re-invoked later" block; on `no`, stop.

## Never touch git history

You have `terminal`, so nothing mechanically stops you from committing. The rule is that you do not.

Read freely — `git status`, `log`, `diff`, `show`, `rev-parse`, `branch --show-current` are all part of understanding a change. Never run anything that writes: no `add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `revert`, `stash`, `cherry-pick`, `tag`, no branch creation or deletion, no `remote` changes.

Producing test cases, findings, or documents is not a reason to commit. Write the files under `testing_docs/` and leave them uncommitted.

Only an explicit instruction in the current turn — "commit this", "push the branch" — authorises it. Never bundle a commit with unrelated work.

---

## Pitfalls

- **Inheriting Claude Code mechanics into Hermes.** References to `mcp__jira-mcp__get_jira_ticket`, `mcp__db-mcp__execute_query`, the `Task` tool for spawning sub-agents, and Claude Code's hook-driven advocate pipeline don't work here. Use `terminal` + `mysql`/`curl`, `skill_view` for the advocate, and the orchestrating pattern above.
- **Inventing expected behavior** because the requirement is silent. Every result must trace to a confirmed source. Where none exists, the case carries `TBD — not established by available evidence`.
- **Reporting a deviation from your assumption as a bug.** Confirm the expected behavior first against a requirement, contract, or established behavior.
- **Skipping the Step 4 understanding.** If you cannot write a plain-language feature summary from evidence fetched in Step 2, you do not understand the feature yet — fetch more, do not proceed.
- **Writing a test case or bug finding before the understanding.** The understanding is a gate.
- **Inventing test data.** Resolve it from the database, ask for it, or mark `TBD` — those are the only three options.
- **Writing credentials into files.** Never write a password, token, or secret into a `testing_docs/` file, or echo one in your output.
- **Using the local checkout as the baseline.** Compare against the remote's default branch, not whatever happens to be checked out locally.
- **Reviewing the wrong tree.** Confirm the implementation is actually in the tree being validated before reviewing.
- **Skipping the basic test.** §3 is the first thing a tester runs; without it, `TC-001` is mistaken for the end-to-end proof.
- **Bundling bug-hunting into a test-case ask.** "Write test cases" means test cases. Run `find-bug` only when explicitly asked, or when re-invoked for the deferred pass.
- **Producing a `Status: CONFIRMED` finding without advocate review.** Per the SOP, this skill produces a claim; the verdict comes from `qa-agent-advocate`. Without it, hold at `UNCONFIRMED`.
- **Overwriting an existing `<KEY>.review.md`.** Three skills share that file. Read it first, then append — never overwrite.
- **Renaming a case without updating the evidence map.** Map and document must be revised together.
- **Pre-empting the user's answer on the deferred bug pass.** Don't write `<KEY>.bug.md` because they might say yes.
- **Holding a partial run hostage to one unknown.** Deliver what doesn't depend on the missing data alongside the question.
- **Touching git history.** Read freely, never write.

## Verification

- [ ] Step 0 project memory read (or absence noted), companion skills loaded before each is invoked
- [ ] Step 1 case classified correctly from the trigger
- [ ] Step 1b output mode (files vs chat) settled before any work
- [ ] Step 1c three-state classification done with `git` checks; state-B and state-C runs ask the user before writing
- [ ] Step 2 fetched real content before any analysis
- [ ] Step 4 understanding written in business language, free of code/paths/columns
- [ ] Step 5 test data resolved from ticket + DB, remainder asked for in one batched request
- [ ] Step 6 ran skills in the documented order; `find-bug` only when explicitly asked or deferred-pass re-invoked
- [ ] Step 7 wrote the right files for the right ask: test-case-only → test + review; bug-hunt → bug + review; both → all three. Files created with `write_file`, verified with `ls`/`wc -l`
- [ ] Step 7 filenames use the verbatim ticket key (no prefix invented)
- [ ] No credentials, passwords, or tokens in any file or echoed in output
- [ ] Read-only DB discipline maintained — no `INSERT`/`UPDATE`/`DELETE`/`ALTER`/`DROP`/`TRUNCATE`
- [ ] No git writes (`add`/`commit`/`push`/`pull`/`merge`/`rebase`/`reset`/`stash`/`tag`) by this skill
- [ ] Step 8 done conditions checked or stop-early reason stated
- [ ] Adversarial review invoked via `skill_view(name='qa-agent-advocate')` with the correct mode; verdicts folded into the reply (chat) or `<KEY>.review.md` (files)
- [ ] Test-case-only runs end with the `Bug hunt not run — ... (yes/no)` handoff line and do not pre-empt the answer
- [ ] Bug-pass re-invocations update every `N/A — bug hunt not yet run` line in `<KEY>.test.md` to `No` or `Yes — [...]` in the same pass that writes the bug file

## Rules

- Read the SKILL.md before running that skill.
- Never produce a test case or bug finding before the Step 4 understanding.
- Never ship a case or a reproduction with invented test data. Resolve it from the database, ask for it, or mark it `TBD` — those are the only three options.
- Never write a password, token or secret into a `testing_docs/` file, and never echo one in your output.
- No bug without evidence from real code, DB state, or logs — and never presented as confirmed before advocate review.
- Case 3: do not analyze files the commit did not touch.
- State assumptions explicitly rather than filling gaps with plausible detail.
