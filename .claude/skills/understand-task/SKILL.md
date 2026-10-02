---
name: understand-task
description: Explain a GitHub issue/PR or Jira ticket clearly and concisely, and extract acceptance criteria as a table (not Gherkin). Use when the user gives a Jira key (e.g. ABC-123), a GitHub issue/PR URL or #number, or pastes ticket text and asks what it means, what it requires, or what the acceptance criteria are.
---

# Understand Task

Turn a GitHub/Jira ticket into a short, unambiguous explanation of what is required, plus a traceable acceptance-criteria table.
**Rule: no verbose noise.** Every line must carry information.

## When to use

- "What does this ticket want?", "Explain ABC-123", "Give me the ACs for #42".
- Before starting dev or test work on a ticket.

**Don't use for:** risk/impact analysis (`analyze-requirement`), writing test cases (`test-design`), bug investigation (`analyze-rootcause`).

## 1. Fetch the source (never skip)

| Input | How to fetch |
|---|---|
| GitHub issue | `gh issue view <n> --comments` (add `-R owner/repo` if outside the repo) |
| GitHub PR | `gh pr view <n> --comments` |
| Jira key/link | Atlassian MCP `getJiraIssue` — include comments, sub-tasks, linked issues |
| Pasted text | Use as-is |

Read: description, **all comments** (they often change scope), type/labels, sub-tasks, linked tickets, referenced designs/attachments.

- Never analyze from the title or ID alone.
- If the ticket cannot be fetched (e.g. MCP not authorized), say so in one line and ask the user to paste the text. Stop.

## 2. Procedure

1. List every explicit statement in the ticket → these become `R-n`.
2. Separate stated facts from assumptions.
3. Resolve conflicts: a later comment overrides the description. Note which source won in the AC's **From** column.
4. Derive acceptance criteria — one checkable condition per row.
5. Anything the ticket doesn't say goes to **Open Questions**. Never fill gaps silently.
6. Run the self-check (section 6) before replying.

## 3. Output template

Fixed order. **Omit any section that would be empty.** No text before or after the template.

```markdown
## <ID> — <Title>
Type: <Story/Bug/Task> · Source: <link> · Status: <status>

### Goal
<1–2 lines: who needs what, and why>

### Requirements
- R-1 <requirement>
- R-2 <requirement>

### Scope
| In scope | Out of scope |
|---|---|
| … | … |

### Acceptance Criteria
| ID | Criterion | From | Basis |
|----|-----------|------|-------|
| AC-1 | <observable pass/fail condition> | R-1 | Explicit |
| AC-2 | <observable pass/fail condition> | Comment @user 12-Sep | Inferred |

### Open Questions
| # | Question | Why it matters |
|---|----------|----------------|
| Q-1 | … | … |

### Assumptions
- <assumption made, and why>
```

Columns:
- **From** — the `R-n` or comment that the AC comes from (traceability).
- **Basis** — `Explicit` (ticket states it) or `Inferred` (derived from what it states). Never `Invented`.

Scope "Out of scope" lists only what the ticket excludes or clearly doesn't cover — don't brainstorm.

## 4. Acceptance-criteria rules

- **One condition per row.** Split anything joined by "and" where one half could pass and the other fail.
- **Observable, pass/fail.** Something a user, screen, API response, record, or notification visibly does.
- **Banned vague words:** properly, correctly, user-friendly, fast, seamless, appropriate, etc.
- **No Gherkin.** No Given/When/Then, no scenario blocks.
- **Business wording.** No function, file, column, or endpoint names.
- **No invented numbers.** No limits, timeouts, or counts the ticket doesn't state — raise them as Open Questions.
- **From the requirement, not the code.** Don't derive ACs from what the current implementation happens to do.
- **Not tasks.** "Add a dropdown" is work; "User can choose one of 4 leave types" is a criterion.

## 5. Conciseness rules (the "no noise" contract)

- No preamble ("Here's the analysis…"), no closing summary, no offers of further help.
- Don't restate or paraphrase the ticket body; distill it.
- Bullets and tables only. Each line ≤ ~20 words.
- No filler: "It's important to note", "Basically", "In order to", "This ticket is about".
- Drop empty sections — never write "None" or "N/A".

## 6. Self-check before replying

- [ ] Source was fetched, not guessed from the title/ID
- [ ] All comments were read; conflicts resolved and attributed
- [ ] Every AC has ID, From, Basis — and is a single pass/fail condition
- [ ] No Gherkin, no implementation names, no invented numbers, no vague words
- [ ] Every gap is in Open Questions, not silently filled
- [ ] No preamble, no summary, no empty sections

## 7. Worked example

Input (Jira HR-214, plus one comment):
> **Title:** Manager approval for leave requests
> Employees submit leave requests. Their line manager must approve or reject. Employee gets notified of the decision. Rejection needs a reason.
> *Comment (PM, 14-Sep):* HR admins can also approve if the manager is on leave. Bulk approval is phase 2.

Output:

```markdown
## HR-214 — Manager approval for leave requests
Type: Story · Source: <jira link> · Status: To Do

### Goal
Line managers approve or reject employee leave requests so leave is authorized before it is taken.

### Requirements
- R-1 Submitted leave requests go to the employee's line manager for a decision.
- R-2 Manager can approve or reject a request.
- R-3 Rejection requires a reason.
- R-4 Employee is notified of the decision.
- R-5 HR admin can approve when the manager is on leave (PM comment).

### Scope
| In scope | Out of scope |
|---|---|
| Single-request approve/reject | Bulk approval (phase 2) |
| Decision notification to employee | |
| HR admin fallback approval | |

### Acceptance Criteria
| ID | Criterion | From | Basis |
|----|-----------|------|-------|
| AC-1 | A submitted request appears in the line manager's pending list. | R-1 | Explicit |
| AC-2 | Manager can approve a pending request; its status becomes Approved. | R-2 | Explicit |
| AC-3 | Manager can reject a pending request; its status becomes Rejected. | R-2 | Explicit |
| AC-4 | Rejecting without a reason is blocked and the manager is told a reason is required. | R-3 | Explicit |
| AC-5 | Employee receives a notification when the request is approved. | R-4 | Explicit |
| AC-6 | Employee receives a notification with the reason when the request is rejected. | R-3, R-4 | Inferred |
| AC-7 | HR admin can approve a request whose line manager is on leave. | R-5 | Explicit |
| AC-8 | A request already decided cannot be approved or rejected again. | R-2 | Inferred |

### Open Questions
| # | Question | Why it matters |
|---|----------|----------------|
| Q-1 | Can HR admin also reject, or only approve? | Comment mentions approve only. |
| Q-2 | Notification channel — in-app, email, or both? | Defines AC-5/AC-6 check. |
| Q-3 | Who decides if an employee has no line manager? | Request could be stuck. |
| Q-4 | How is "manager on leave" determined — approved leave record or manual flag? | Controls when AC-7 applies. |
```
