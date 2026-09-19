---
name: analyze-rootcause
description: Find the most probable root cause from logs and errors.
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [debugging, sdet, root-cause, logs, incidents]
    related_skills: [systematic-debugging, analyze-requirement, requesting-code-review]
---

# Analyze Root Cause

Take a log, stack trace, or error report and produce a ranked root-cause analysis with reproduction steps, impact, and fix — backed by evidence from logs, code, or the live database, never from memory.

## When to Use

- A user pastes a stack trace, error log, or test failure and asks "what's wrong?" / "why did this fail?"
- After an incident: produce a writeup in the standard six-section shape
- Before opening a bug ticket — make sure the cause and repro are nailed down first

**Don't use for:** requirement analysis (use `analyze-requirement`), explaining how code works (use `explain-code`), or proposing fixes without yet identifying a cause (that's design work, not debugging).

## Prerequisites

- A log, stack trace, or error description. Without one, say so and stop.
- Access to the live database if the failure involves record state. Migrations and model definitions show what *should* be there — only the live DB shows what *is* there. If DB access is unavailable, record it as a limitation and continue with what you have.
- Access to the code that produced the error. If unavailable, record it as a limitation.

## How to Run

Use this skill inside any Hermes session by referencing it (`skill_view(name='analyze-rootcause')` first if uncertain), then respond with the six sections below. Read evidence before stating causes — no claims without logs, code, or DB support.

## Procedure

1. **Capture the evidence.** Quote the exact log line / stack trace / error message. If the user only described the symptom, ask for the actual log before proceeding.
2. **Read the deployed state.** If the error involves records, query the live DB — count rows, sample data, check column values. Migrations lie; the live schema tells the truth.
3. **Read the code path.** Open the file and the *branches around* the line the log names, not just the named line. Most root causes live one level up from the stack trace's leaf.
4. **Write §1 Error** — what failed, where (file:line if known).
5. **Write §2 Root Cause** — one most-likely cause, ranked by confidence. If uncertain, up to three, ordered. Cite the evidence (log line, code branch, DB row) for each.
6. **Write §3 Flow** — what happened before the failure: input → code path → DB write (if any) → error. Concise, factual.
7. **Write §4 Reproduction** — step-by-step with concrete values: input, headers, account id, env. Vague steps are not reproduction.
8. **Write §5 Impact** — system / data / user. Be specific: which records are wrong, which users see what, what is exposed.
9. **Write §6 Fix** — Immediate (what to change to stop the failure now) + Preventive (what to change to keep it from recurring — log message, validator, contract test, schema guard).
10. **Self-review.** No cause claimed without a quoted log line, a code branch, or a DB observation backing it.

Completion criterion: every cause in §2 cites the evidence that points to it; §4 contains concrete input values; §5 distinguishes immediate from preventive.

## Output Format

Six labeled sections in order:

### 1. Error
- What failed
- Where

### 2. Root Cause
- Most likely reason (ranked by confidence if multiple)
- Why (based on evidence from logs/code/DB)

### 3. Flow
- What happened before failure

### 4. Reproduction
- Step-by-step actions to reproduce the failure (be specific: input values, state, environment conditions)

### 5. Impact
- system / data / user

### 6. Fix
- Immediate fix: what to change to stop the failure now
- Preventive: what should be improved to avoid recurrence

## Pitfalls

- **Stating a cause from memory of the codebase** without reading the actual line. The code that produced the error is the code to read.
- **Trusting migrations or model definitions** as evidence of record state. They describe intent, not deployment reality.
- **Vague reproduction steps** ("send a request, it fails"). Specific values (account id, header, role, payload) are non-negotiable.
- **Single-cause confidence on flaky symptoms.** If logs show intermittent failures, rank multiple causes by confidence rather than picking one.
- **No preventive fix.** A patch that only restores current behavior guarantees the next regression. Always include the guard.
- **Hiding missing evidence.** If the DB is inaccessible or the code path can't be read, say so in §2 as a confidence-reducing limitation. Don't paper over it.

## Verification

- [ ] §1 quotes or names the exact error and location
- [ ] §2 cites log/code/DB evidence for each ranked cause
- [ ] §3 traces input → code → DB → error, not just the leaf frame
- [ ] §4 contains concrete input values and preconditions
- [ ] §5 distinguishes system, data, and user impact
- [ ] §6 has both immediate and preventive fixes
- [ ] Limitations section (or inline note) records any evidence source that was unavailable

## Rules

- Max 3 possible causes if uncertain
- No guessing without evidence
- Concise only
