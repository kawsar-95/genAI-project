---
name: find-bug
description: "Review code, commits, or branches for high-confidence bugs."
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [qa, bug-hunting, security-review, regression, sdet]
    related_skills: [test-design, analyze-requirement, analyze-rootcause, explain-code]
---

# Find Bugs

Act as a senior QA bug hunter. Report only evidence-backed, reachable issues with meaningful impact. The SOP body below is the full procedure. The sections that follow (`When to Use`, `Prerequisites`, `How to Run`, `Quick Reference`, `Pitfalls`, `Verification`) wrap that SOP for the skill loader; the SOP itself is the canonical contract.

## When to Use

- A user shares a commit, branch, PR, or file and asks "what's broken?" / "any bugs?" / "review this change"
- Targeted bug hunting against a named module, endpoint, or flow
- Regression analysis — comparing a branch against its baseline to surface *new* defects introduced by the change
- Security review of an auth/authorization/IDOR change
- After `test-design` flags suspected defects and routes them here for investigation

**Don't use for:** explaining code (use `explain-code`), debugging a single failure trace (use `analyze-rootcause`), analyzing a requirement or ticket that has no implementation yet (this skill requires code to review), or writing test cases (use `test-design`).

## Prerequisites

- A target to review: pasted code, a file path or symbol, a commit hash, a branch name, or a Jira ticket pointing at a change.
- For branch/commit review: a working tree containing the target, or read access via `git show <ref>:<path>` when the change lives on an unmerged ref.
- A baseline for regression classification — the repository's actual integration branch (default branch on the remote, or the branch the work targets), not whatever is checked out locally.
- **The adversarial review skill `qa-agent-advocate` must be available.** Per the SOP's "find-bug → qa-agent-advocate" pipeline, every candidate finding must be challenged before it appears in the reply or `*.bug.md`. Without it, downgrade every finding's confidence by one level and note the missing review pass.

## How to Run

Use this skill inside any Hermes session by referencing it (`skill_view(name='find-bug')` first if uncertain). Output lands in `testing_docs/<TICKET-ID>.bug.md` when a Jira ticket key is given, otherwise in the reply. The SOP body below is the procedure — read it end to end before producing any output.

## Quick Reference

- **Output target** — `testing_docs/<TICKET-ID>.bug.md` (companion to `*.test.md` and `*.review.md`) when a Jira ticket key is present; otherwise deliver in the reply.
- **Finding cap** — at most 8 total findings per run (Functional + Security + Improvements combined).
- **Title format** — `[Module] Action produces incorrect result under specific condition`.
- **Reproduction** — black-box only: actor, setup, external action, concrete input, observable wrong result. No internal functions, file paths, or line numbers in reproduction — those go in `Evidence`.
- **Confidence** — `High` (execution path, requirement, impact, and state all verified), `Medium` (strong code evidence, one missing runtime check), `Low` (omit unless explicitly useful — usually speculative).
- **Status** — `NEW BUG` (introduced by the reviewed change) / `EXISTING BUG` (already in baseline) / `UNDETERMINED` (no reliable baseline).
- **Empty result** — when no finding meets the threshold, reply with `No high-probability bugs identified.` and a brief summary of what was inspected.
- **Pipeline** — every candidate must be challenged by `qa-agent-advocate` first. Rejected candidates do not appear in the reply (no ticket) or appear as a checked-and-rejected line in `*.review.md` (ticket present).

---

# Find Bugs (SOP body)

Act as a senior QA bug hunter. Report only evidence-backed, reachable issues with meaningful impact.

## Principles

- Prefer a few high-confidence findings over speculative coverage.
- Distinguish bugs from code quality concerns, theoretical risks, invalid setup, and accepted tradeoffs.
- Confirm the expected behavior from requirements, project rules, documentation, tests, or established behavior.
- Treat unavailable evidence as uncertainty. Lower confidence or mark the finding for live verification.
- Never modify application code, data, or external systems unless the user explicitly requests it.

## Inspect the Target

Select the appropriate method:

- Pasted code: analyze it directly.
- File or symbol: locate and read the implementation, surrounding code, and callers.
- Commit: inspect the full diff and affected files.
- Latest change: inspect `HEAD`.
- Feature branch: determine the correct baseline, inspect unique commits, and compare the complete branch diff.
- Ticket or requirement: read it before judging whether behavior is incorrect.

Search the repository rather than reasoning from the diff alone. Read referenced modules, shared utilities, configuration, tests, API documentation, migrations, and callers when they affect the execution path.

Do not infer behavior from an isolated diff when unchanged code controls the outcome.

**Confirm the target is actually present before reviewing it.** Given a ticket, check that its implementation is in the working tree — a commit reachable from `HEAD` carries the key and contains real work. A branch *name* matching the ticket is not evidence: a branch can be cut and never worked on. If the implementation is not there, stop — the code you would review is not the code the ticket describes, and every finding would be about the baseline. Say what you checked and what you found, and ask for the branch rather than reviewing the wrong tree.

Record the tree you reviewed — branch, `HEAD`, whether it is behind its remote, whether it is dirty — with the findings. On a branch behind its remote, say so before reporting: bugs already fixed upstream will read as current. On a diverged tree, stop rather than pick a side.

A ticket whose feature has not been built yet has no bugs to find. That is not a null result to report as "no issues" — it is a run that never happened, and it must be reported as such. Test cases can still be designed from the requirement; bug findings cannot.

**Code on a ref you have not checked out is a third case, not the second.** An unmerged commit or another branch reads fine with `git show <ref>:<path>`, so a review is possible — but nothing is executable, so nothing is reproducible. Findings from it are legitimate and must carry three things: the ref and short sha in `Environment`, `NEEDS LIVE VERIFICATION` in place of a reproduction, and the fact that the branch may still be rebased, squashed or dropped before it merges. None may be recorded `CONFIRMED`. Re-run against the merged code to settle them.

## Review Workflow

1. Define the scope, expected behavior, actors, valid setup, and comparison baseline.
2. Inspect the change and trace each affected flow from its external entry point to its observable result.
3. Identify candidate failures at boundaries such as authorization, validation, state transitions, persistence, integrations, concurrency, and error handling.
4. Validate every candidate using the checklist below.
5. Compare confirmed findings with the baseline.
6. Rank findings by impact and confidence.
7. Report only the strongest findings using the required format.

## Validation Checklist

Complete every applicable check before declaring a bug:

- **Business rule:** Confirm the behavior violates a known requirement or established contract.
- **Reachability:** Confirm a real actor can reach the path with valid setup and realistic data.
- **Execution flow:** Trace all relevant branches, defaults, error paths, and side effects.
- **Callers:** Check every meaningful caller and the business operation it represents.
- **Authorization:** Verify authentication, role, permission, ownership, and tenant boundaries on the server side.
- **Input trust:** Check whether client-controlled identifiers, roles, prices, ownership, status, paths, queries, templates, or commands are independently validated.
- **Lifecycle:** Rule out intentional differences between draft/final, start/end, create/update, pending/completed, or similar stages.
- **UI state:** Check initializers, defaults, reactive state, route state, storage, props, and manual refresh behavior before claiming a display or synchronization bug.
- **Data state:** Query the relevant environment when the claim depends on schema, migration, row values, or deployment state. Use read-only database operations.
- **Deployment order:** Confirm the migration and application deployment sequence before claiming incompatibility.
- **External contract:** Check public API documentation and integration behavior before claiming backward incompatibility.
- **User impact:** Require a concrete wrong result, broken workflow, data integrity problem, or exploitable security impact.
- **Live behavior:** If a cross-component, timing-dependent, or environment-dependent claim cannot be reproduced, mark it `NEEDS LIVE VERIFICATION`.

Reject or downgrade any candidate that depends on an unverified assumption.

## Regression Classification

For branch or commit reviews, compare each confirmed finding with the chosen baseline:

- `NEW BUG`: introduced or newly exposed by the reviewed change.
- `EXISTING BUG`: the same defect already exists in the baseline.
- `UNDETERMINED`: no reliable baseline is available.

Use the repository's actual integration branch as the baseline — determine it from the remote's default branch or the branch this work targets, rather than assuming a name. Never compare against whatever happens to be checked out locally.

## Security Review

Actively inspect:

- missing or incorrect authentication and authorization
- IDOR and cross-user, cross-location, or cross-tenant access
- trusted client-controlled fields
- injection into queries, commands, paths, templates, or evaluation
- secret, stack trace, or protected-data exposure
- validation or workflow guards that can be bypassed

Report a security issue only when a concrete external attack path and security impact are both established. Otherwise classify it as an improvement.

## Reproduction Rules

Write reproduction steps from a black-box perspective so a tester without source access can execute them.

Each reproduction must state:

1. the actor and required setup
2. the external action or request
3. the concrete input
4. the observable incorrect result

UI actions, public API requests, scheduled triggers, and supported integration events are valid entry points. If the UI blocks the triggering input but the API accepts it, state that the issue requires a direct API request.

Keep internal functions, variables, SQL, repositories, file paths, and line numbers out of reproduction and attack steps. Put them in `Evidence`.

If no external trigger exists, state that clearly and do not present an internal code path as a black-box reproduction.

## Output Format

### Where it goes

When the work belongs to a Jira ticket, write the findings to `testing_docs/<TICKET-ID>.bug.md`, where `<TICKET-ID>` is that ticket's key verbatim — `DEV-2951`, `TASK-5`, `PROJ-123` — creating the directory if it does not exist (reuse one already present in the working directory or a parent, otherwise create it in the repository root beside `.claude/`) — the bug file in the three-file set the `test-design` skill defines: `<TICKET-ID>.test.md` for test cases, `<TICKET-ID>.bug.md` for bugs, `<TICKET-ID>.review.md` for the adversarial review. Open it with a link back: `Companion to [<TICKET-ID>.test.md](<TICKET-ID>.test.md).`

**With no ticket, write no file.** An ad-hoc "find bugs in this module" is answered in the reply, with the same fields and the same black-box reproduction discipline, and no companion files.

The adversarial review still happens — `qa-agent-advocate` challenges the findings either way. Without a ticket its verdicts are applied to the reply rather than written to a review file: a rejected candidate is dropped or downgraded before you answer, not softened and kept. Be to the point; skip the preamble and the coverage narration.

Rules for that file:

- **No test cases in it.** A bug's reproduction steps are not a test case; if the behavior needs standing coverage, that is `test-design`'s job in the document.
- **Only findings that survived challenge.** Run each candidate past `qa-agent-advocate` first — always, ticket or not. A candidate it rejects does not get a softened write-up: with a ticket it goes to `<TICKET-ID>.review.md` as a checked-and-rejected line with the reason, and without one it simply does not appear in the reply.
- **Label unconfirmed candidates as such.** If a finding is real at code level but has no live reproduction yet, keep it under `Improvements` or mark `Status: UNDETERMINED` and say what verification is missing. Never present a code-trace hypothesis as a reproduced defect.
- **Read an existing `<TICKET-ID>.review.md` before adding a finding** — it may already record that exact candidate as rejected, and re-raising it wastes a review cycle.
- When running alongside test design on the same ticket, expect one-line suspicions handed over from that pass; investigate each independently rather than inheriting its conclusion.

### Structure

Use only the applicable sections and omit empty sections. Report at most eight total findings.

Title each finding as `[Module] Action produces incorrect result under specific condition` — for example `[Profile] Total experience is not recalculated when an ongoing employment record is updated`.

```markdown
## Functional Bugs

### <Title>
- Summary:
- Environment: which environment it was reproduced on, and the branch or commit
- Role: the user role it reproduces as
- Preconditions: required setup and data
- Steps to reproduce:
- Expected result:
- Actual result:
- Reproducibility: always | intermittent (state the rate) | once
- Priority: Critical | High | Medium | Low
- Business impact: what it costs the business or the user
- Confidence: High | Medium | Low
- Status: NEW BUG | EXISTING BUG | UNDETERMINED
- Related ticket:
- Evidence:

## Security Issues

### <Title>
- Summary:
- Attack path:
- Security impact:
- Priority: Critical | High | Medium | Low
- Confidence: High | Medium | Low
- Status: NEW BUG | EXISTING BUG | UNDETERMINED
- Evidence:

## Improvements

### <Title>
- Summary:
- Priority: High | Medium | Low
- Confidence: High | Medium | Low
- Why this is not a confirmed bug:
```

In `Evidence`, cite the relevant code location, execution flow, violated rule, baseline comparison, and completed validation checks. State any missing verification that reduced confidence.

If no finding meets the threshold, respond with:

`No high-probability bugs identified.`

Briefly summarize what was inspected and why no candidate qualified.

## Priority and Confidence

Priority is impact-based severity. Judge it by what actually happens to the business, never inflate it to make a finding look important, and never deflate it to get a finding accepted:

- `Critical`: system unavailable, severe security breach, irrecoverable data loss, incorrect financial transaction, or a critical workflow blocked for all users.
- `High`: major feature unavailable, important workflow blocked, serious permission violation, or significant data inconsistency, with no practical workaround.
- `Medium`: feature partially works, or incorrect behavior with a workaround; validation or integration issues of limited scope.
- `Low`: minor UI, text, cosmetic, or low-impact usability problem that still violates expected behavior.

Assign confidence by evidence:

- `High`: execution path, requirement, impact, and relevant state are verified.
- `Medium`: strong code evidence exists, but one material runtime or environment check is missing.
- `Low`: the finding depends on multiple unverified assumptions; normally omit it.

---

## Pitfalls

- **Reporting a hypothesis as a reproduced defect.** Every finding must trace the full execution path through a real entry point with realistic data. Unverified code-trace candidates belong under `Improvements` or carry `NEEDS LIVE VERIFICATION`.
- **Inventing reproduction steps for unreachable paths.** If a real actor cannot reach the path with valid setup, the finding is not a bug — drop it.
- **Using the local checkout as the baseline.** Compare against the remote's default branch, not whatever happens to be checked out locally.
- **Reviewing the wrong tree.** Confirm the target is actually present (a branch name matching a ticket is not evidence) before reviewing. Stop and ask when it isn't.
- **Confusing code-quality with correctness.** Style, naming, or "this could be cleaner" is not a bug unless it produces a wrong result. Route such observations to `Improvements` or skip them.
- **Inflating priority.** `Critical` requires an unrecoverable, all-users, or financial-impact failure. A workflow with a workaround is not `Critical`. Judge by what actually happens, not by what could happen if every guard failed simultaneously.
- **Deflating priority to get acceptance.** A security issue that exposes another user's data is `High` regardless of who wants it downgraded.
- **Reproducing through internals.** Reproduction steps are black-box: actor, setup, external action, input, wrong result. File paths and line numbers belong in `Evidence`, never in the reproduction.
- **Skipping the baseline comparison.** `NEW BUG` vs `EXISTING BUG` vs `UNDETERMINED` is the difference between a regression and a known debt. Always state which.
- **Re-raising a candidate already rejected.** Read any existing `<TICKET-ID>.review.md` before adding a finding — the rejection may already be recorded.
- **Softening a rejected candidate into the reply.** With a ticket, rejected candidates go to `*.review.md` with the rejection reason. Without a ticket, they do not appear at all. A softened write-up that survives challenge as "improvement" is still a soft write-up.
- **Exceeding the eight-finding cap.** Eight is the maximum, not a target. Fewer high-confidence findings beats more speculative ones.

## Verification

- [ ] Tree reviewed is named in `Environment` for every finding — branch, HEAD, whether dirty, whether behind remote
- [ ] Baseline is the remote's default branch or the work's target branch, not the local checkout
- [ ] Each finding passes the validation checklist; failed checks reduce confidence, not the other way around
- [ ] Each finding has a black-box reproduction (actor, setup, external action, input, wrong result) — or is marked `NEEDS LIVE VERIFICATION` with a stated reason
- [ ] Reproduction steps contain no internal function names, file paths, line numbers, SQL, or shell commands — those live in `Evidence`
- [ ] Priority is impact-based and not inflated or deflated
- [ ] Confidence is evidence-based — High requires verified execution path, requirement, impact, and state; Medium requires only one missing runtime check
- [ ] `Status` field uses the correct term — `NEW BUG` / `EXISTING BUG` / `UNDETERMINED` — based on baseline comparison
- [ ] Security findings state an attack path and security impact; otherwise routed to `Improvements`
- [ ] At most eight findings across all three sections; fewer high-confidence findings beats more speculative ones
- [ ] When no finding qualifies, output reads `No high-probability bugs identified.` with a brief inspection summary
- [ ] Bug file (when written) opens with the link back to `<TICKET-ID>.test.md` and contains no test cases, no severity-as-evidence, and no narrative beyond the required fields
- [ ] Existing `<TICKET-ID>.review.md` was read before adding any finding; rejected candidates were not re-raised
- [ ] Adversarial review by `qa-agent-advocate` ran against every candidate — verdicts applied (rejected candidates dropped, downgraded, or routed to `*.review.md`), not deferred to the reader
