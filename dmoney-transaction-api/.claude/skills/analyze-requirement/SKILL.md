---
name: analyze-requirement
description: Turn a requirement into testable acceptance criteria.
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [qa, requirements, acceptance-criteria, sdet]
    related_skills: [systematic-debugging, requesting-code-review, test-driven-development]
---

# Analyze Requirement

Turn a requirement or Jira ticket into a senior-SDET analysis: business flow, scope, risks, gaps, edge cases, and acceptance criteria written so a stakeholder can approve them line by line.

## When to Use

- A user shares a Jira ticket, requirement doc, or feature spec and asks "what is this?" / "what should I test?" / "write acceptance criteria"
- A PM asks for risk/gap analysis on a proposed feature
- Before any test design — `test-design` reads the ACs this skill produces

**Don't use for:** bug investigations (use `analyze-rootcause`), explaining how code works (use `explain-code`), or writing test cases (use `test-design`, which consumes this skill's criteria as input).

## Prerequisites

- The requirement text or a Jira ticket reference. If a Jira id/link is given, fetch the ticket via your team's MCP/connector — never analyze from the id alone.
- If neither text nor a retrievable ticket is available, say so explicitly and analyze only what is in front of you.

## How to Run

Use this skill inside any Hermes session by referencing it (`skill_view(name='analyze-requirement')` first if uncertain), then respond to the user with the eight sections below. No scripts, no MCP setup beyond what the invoking agent already has.

## Procedure

1. **Confirm the source.** Did the user paste text, link a Jira ticket, or give an id? If id only, fetch the ticket before proceeding. Record the source.
2. **Write §1 Summary** — one paragraph: feature, user, goal. No implementation details.
3. **Write §2 Business Flow** — main flow, key conditions, input→output as bullets.
4. **Write §3 Scope** — explicit In / Out of scope. Out of scope is more useful than people expect.
5. **Write §4 System Impact** — UI / API / DB / services / roles touched. Mark each as Direct, Indirect, or None.
6. **Write §5 Risks** — Functional / Data / Security / Performance. Each risk gets a one-line "why".
7. **Write §6 Gaps** — missing requirements, assumptions made, questions to resolve. If you must assume, label the assumption.
8. **Write §7 Edge Cases** — 3–5 boundary conditions or failure paths. Skip if none are plausible.
9. **Write §8 Acceptance Criteria** — see "Acceptance Criteria" section below. Only if asked, or if the ticket has none and someone will have to test it anyway. Say which.
10. **Self-review before replying.** Every criterion: observable, testable, unambiguous, business-worded, traceable to the requirement. Drop any that fail.

Completion criterion: eight labeled sections, every AC has an `AC-n` id, no criterion invented beyond what the ticket states.

## Acceptance Criteria

Write these when the user asks for acceptance criteria, or when the ticket has none and someone will have to test it anyway. Say which of the two applies.

An acceptance criterion states a condition someone can check and agree on. It is not a task, not a design note, and not a test case — a test case says how to check it; the criterion says what must be true.

Each one must be:

- **Observable** — phrased as something a user, an API response, a record, or a notification visibly does. If nobody can see it happen, it cannot be accepted.
- **Testable** — one clear pass or fail. "Works reliably", "is user-friendly", "performs well" are opinions until a number or a visible outcome is attached.
- **Unambiguous** — one reading only. Split anything joined by "and" that could pass on one half and fail on the other.
- **Business-worded** — no file names, function names, column names, or endpoint internals. The people accepting this feature do not read the codebase.
- **Traceable to the requirement** — derived from what the ticket or requirement actually says, never from what the implementation happens to do. Where the ticket is silent, that is a gap in §6, not a criterion you invent.

Format them as a numbered list a stakeholder can approve line by line:

```markdown
### 8. Acceptance Criteria

AC-1 — A support agent can record a session type when starting a call, and the recorded type is shown against that call afterwards.
AC-2 — A call cannot be closed without an issue type; attempting it leaves the call open and tells the agent what is missing.
AC-3 — Calls logged before this change remain visible and show no session type, rather than a default one.
```

Give each criterion a stable `AC-n` id, since test cases and review notes will cite it.

### What not to do

- Do not restate the ticket's task list as criteria. "Add a dropdown" is work; "the agent can choose one of four session types, and the choice is stored" is a criterion.
- Do not write a criterion for behavior the requirement never claims, however sensible it seems. Raise it as a gap or a question instead.
- Do not attach numbers nobody specified — no response-time target, retry count, or limit unless the requirement or an established contract states one.
- Do not exceed what the requirement covers. Missing criteria are a finding; invented ones are fabrication.

## Output Format

Eight labeled sections in order:

1. Summary — Feature, User, Goal
2. Business Flow — Main flow, Key conditions, Input→output
3. Scope — In scope / Out of scope
4. System Impact — UI/API/DB/services/roles
5. Risks — Functional/Data/Security/Performance
6. Gaps — Missing requirements, Assumptions, Questions
7. Edge Cases — 3–5 boundary conditions / failure paths
8. Acceptance Criteria — only when asked for, or when the ticket has none

## Pitfalls

- **Inventing criteria** because the requirement is thin. If thin, raise that as a gap in §6 and stop.
- **Restating the ticket's tasks** as criteria. "Add a field" is work, not acceptance.
- **Implementation-anchored wording** ("the `users.status` column is set to 'active'"). Reframe to the user-visible behavior.
- **Compound criteria** joined by "and" where one half can pass while the other fails. Split them.
- **Skipping the source-of-truth check.** A Jira id without the ticket fetched is not analysis, it's guessing at the title.

## Verification

- [ ] Source of the requirement is named (pasted text / fetched ticket / unknown)
- [ ] §1–§7 present and non-empty (or "none" with a reason)
- [ ] Every AC has a stable `AC-n` id
- [ ] Each AC is observable, testable, unambiguous, business-worded, traceable to the requirement
- [ ] No invented numbers (timeouts, limits, retries) the requirement never specified
- [ ] Gaps section flags every place an assumption was made

## Rules

- Concise — bullet points only.
- No test cases here. If the user wants cases, that is `test-design`, working from these criteria.
- No deep code explanation. If they want the mechanics, that is `explain-code`.
- If the requirement is too thin to write criteria from, say exactly what is missing rather than filling the gaps yourself.
