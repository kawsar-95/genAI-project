---
name: pr-review
description: Review a GitHub pull request against the issues/bugs it closes, superpowers-style (a fresh read-only reviewer subagent, findings graded Critical / Important / Minor, a merge verdict), then write one report per issue to .artifacts/<ISSUE ID>_review.md. Use when the user asks to "review PR #N", "review this PR", "PR review", "pr-review", or wants a review report per issue/bug for a PR.
---

# PR Review (per-issue reports)

Review a pull request against the requirements of every issue it closes, and write **one report per issue**.

**Hard rules**
1. **The reviewer is a separate subagent.** Don't review the diff inline. Give a fresh `general-purpose` subagent exactly the context it needs (the template in [reviewer-prompt.md](reviewer-prompt.md)), never this session's history. This is the superpowers `requesting-code-review` method. If the superpowers plugin is installed, read `skills/requesting-code-review/SKILL.md` from it first, and follow it wherever it differs from this file.
2. **Read-only.** The review must not change the working tree, the index, HEAD, the branch, or the database, and must not start servers. The only files written are the reports in step 6.
3. **Verify before you report.** Re-check every Critical and Important finding yourself with a read-only command or query before it goes into a report. Mark each one as verified, or as reviewer-reported only. Push back with evidence when the reviewer is wrong.
4. **Never commit, push, or comment on the PR** unless the user asks.
5. **GitHub access:** use the user's normal `gh` and git setup. Don't inject tokens through inline credential helpers or `GH_TOKEN`. The user has rejected that. If `gh` can't see the repo (wrong active account), stop and tell the user which account is needed.

## Inputs
- **PR:** a number (`8`), a URL, or a branch. If none is given, use the open PR for the current branch (`gh pr view --json number`).
- **Issue IDs:** taken from the PR, in this order:
  1. The `Closes/Fixes #N` lines in the PR body.
  2. Each issue's body: a `**Bug Id:** XX-NNN` line gives the bug ID (for example, `SM-H01`).
  3. The matching `qa-findings/*.md` file, which holds the full requirement for each bug ID.

  **`<ISSUE ID>`** in the file name is the bug ID when one exists (`SM-H01`). Otherwise it is the GitHub issue number (`7`).

## Procedure

### 1. Collect PR facts
```bash
gh pr view <PR> --json number,title,body,baseRefName,headRefName,headRefOid,url
gh pr diff <PR> --name-only
git fetch origin <base> <head>   # skip if the branch is already local
BASE_SHA=$(git merge-base origin/<base> <headRefOid>)
HEAD_SHA=<headRefOid>
```
Parse the closed issues from the body. For each one, run `gh issue view <N> --json number,title,body` and record `{issue #, bug ID, title, priority}`.

### 2. Collect the requirements
- For every issue, find its section in `qa-findings/` (`grep -rn "<BUG ID>" */qa-findings/`). Pass the reviewer the **file path**, not pasted text.
- Note the project rules the reviewer must follow, such as `dmoney-transaction-api/CLAUDE.md` (the READ_COMMITTED + `FOR UPDATE` locking pattern and the config-driven business rules).
- Note any testing already done in this session or listed in the PR's Testing section. The reviewer needs to know what was manually checked.

### 3. Send the reviewer
Fill in [reviewer-prompt.md](reviewer-prompt.md) and send it with `Agent(subagent_type: "general-purpose", run_in_background: false)`. Fill in:
- `{DESCRIPTION}`: what the PR changes, file by file, in plain words.
- `{REQUIREMENTS}`: the issue → bug ID → title list, plus the `qa-findings` path.
- `{BASE_SHA}`, `{HEAD_SHA}`.
- `{FOCUS}`: the areas most likely to hide bugs in this diff, for example locking or concurrency, other callers of a changed function, input validation edge cases, or API backward compatibility.
- `{ISSUE_SECTIONS}`: the bug IDs to cover, one section each.

### 4. Verify the findings (rule 3)
- Re-run each Critical and Important claim with the smallest read-only check that proves or disproves it:
  - `node -e` for JS semantics.
  - `mcp__dmoneydb__mysql_query` (read-only) for DB or collation behaviour.
  - `git show <HEAD_SHA>:<file>` for code at a given line.
- Drop or downgrade anything that doesn't hold up, and say why.

### 5. Decide the verdicts
- **Per issue:** ✅ Fixed, ⚠️ Partially fixed, or ❌ Not fixed. Add **Blocks merge** if the issue has an unfixed Critical or Important finding, or a deviation from the spec.
- **For the PR:**
  - **Ready to merge.** No blockers.
  - **With fixes.** There are blockers, but each one is small and local.
  - **No.** The core fix is wrong or missing.

### 6. Write one report per issue
Path: `<project>/.artifacts/<ISSUE ID>_review.md`, in the project that holds the changed code, for example `dmoney-transaction-api/.artifacts/SM-H01_review.md`. Create `.artifacts/` if it's missing. If a report already exists, read it first and overwrite it only for the same PR.

Use this template:

````markdown
# <ISSUE ID> Review: <issue title without the [Module] prefix>

| | |
|---|---|
| **Bug** | <BUG ID> · [Issue #<N>](<issue url>) · <Priority> |
| **PR** | [#<PR> `<head>` → `<base>`](<pr url>) |
| **Range reviewed** | `<base7>..<head7>` |
| **Review method** | superpowers `requesting-code-review`: an independent read-only reviewer subagent, with the findings checked by the coordinator |
| **Date** | <YYYY-MM-DD> |
| **Verdict for this bug** | ✅/⚠️/❌ **<verdict>**<, **Blocks merge**> |

## Requirement
<the expected result in 1–2 sentences, with the BRD section>

## Fix in this PR
- <what changed, with `file:line` at HEAD>

## Assessment
- **Fixed?** <Yes / Partially / No>
  - <reasoning, as sub-bullets>

### Strengths
- <specific>

### Issues
| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| **Important** | `file:line` | <what's wrong + why it matters> | <how to fix> |
<or "None specific to this bug.">

### Independent verification     <!-- only when a Critical/Important finding was re-checked -->
- <command or query> → <result>

## Suggested verification
<concrete curl / SQL / UI steps with expected results>
**Already run (<date>, <env>):** <manual results, if any> | **Not yet run:** <what wasn't checked>

## Out of scope (tracked separately)     <!-- only if the reviewer declined something relevant -->
- <item>

## PR-level context
- **Overall PR verdict:** **<verdict>**
- **Must fix before merge:**
  - <blocker>
- **Follow-up:** <follow-ups>
- **Process gaps:** <process gaps>
````

**What goes where:**
- A cross-cutting issue goes in the report of the bug it relates to most. For example, a lock or race problem in another controller goes under the concurrency bug.
- Every report repeats the short **PR-level context** at the end, so each file can be read on its own.

### 7. Reply to the user
- Start with one line that names the audience, for example "Written for: developers and QA reviewing PR #N."
- A table: report link → verdict.
- The merge blockers, in 1–2 lines each.
- One closing question offering to fix the blockers on the same branch.
- Don't paste the reports into the chat.

## Pitfalls
- **Missing `Closes #N` lines.** If the PR body has none, ask which issues the PR is meant to fix. Don't guess from the diff.
- **Same-account checks.** In dMoney, the string compared in JS is not what MySQL compares under `utf8mb4_unicode_ci`: trailing spaces, zero-width characters and full-width digits all collate as equal. Check identity comparisons at the DB level.
- **Lock analysis.** `Transactions` has no index on `account`, so `FOR UPDATE` scans the whole table. Ask the reviewer to reason about InnoDB locking under READ_COMMITTED rather than assume a per-account lock.
- **Background `graphify-out/` changes.** A commit triggers a graphify rebuild that leaves changes under `graphify-out/`. Ignore them in the review, and never stage or revert them.
