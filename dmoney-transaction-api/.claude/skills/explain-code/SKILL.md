---
name: explain-code
description: Explain code flow, logic, and business behavior from source.
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [code-reading, sdet, explanation, comprehension]
    related_skills: [systematic-debugging, analyze-rootcause, analyze-requirement]
---

# Explain Code

Read code and explain what it does — the flow, the logic, the data path, and the business meaning — based on the implementation itself, never on filenames, symbol names, or guesswork about what the code probably does.

## When to Use

- A user points at a file, commit, function, or symbol and asks "what does this do?" / "walk me through this"
- Onboarding to a new codebase or module
- Before designing tests — `test-design` needs a real understanding of the code under test
- Pre-review: confirm a PR does what its author claims

**Don't use for:** debugging failures (use `analyze-rootcause`), explaining what a *requirement* should do (use `analyze-requirement`), or writing test cases (use `test-design`).

## Prerequisites

- A source to explain: file path, commit hash, function/symbol name, or inline code paste. If none is given, ask before proceeding.
- Read access to the code. If a path is given but unreadable, record it as a limitation and analyze only what is actually retrievable.
- For code that reaches across files (helpers, services, models), read the callees — far enough to trace the whole flow, not just the named entry point.

## How to Run

Use this skill inside any Hermes session by referencing it (`skill_view(name='explain-code')` first if uncertain), then respond with the seven sections below. Read the full file or full diff before writing — never summarize from a fragment.

## Procedure

1. **Capture the source.** Note the exact file path, commit hash, or symbol the user gave. If vague ("explain the auth code"), ask which file before reading.
2. **Read in full.** Whole file for a path. Full diff for a commit (resolve against the parent). Implementation + surrounding branches for a symbol. Inline text as-is.
3. **Trace across files.** If the code calls helpers, services, or DB models, read those too — at least the called functions and their immediate branches. Stop when the trace becomes a tour of the whole repo; record remaining unknown callees in §6 Dependencies.
4. **Write §1 Purpose** — one paragraph: what this code does, in business terms, not implementation terms.
5. **Write §2 Flow** — entry point → function calls → return/exit, with branching paths and early returns noted in-line. If the entry is a route handler, show the request → middleware → controller → service → response path.
6. **Write §3 Logic** — conditions and decisions: branches, guards, validations, error short-circuits. Quote the condition when the wording matters.
7. **Write §4 Components** — functions, APIs (REST/GraphQL/queues), DB tables/models. Distinguish local from external.
8. **Write §5 Data Flow** — input shape → transforms → store or return. Note type coercions and where validation actually runs.
9. **Write §6 Dependencies** — sibling modules, services, env vars, external APIs. Mark anything in §2/§5 that you did *not* read as "not traced".
10. **Write §7 Risks** — logical (incorrect conditions), data (wrong type/coercion), concurrency (race conditions, missing locks). One line each with the evidence (which branch, which variable).
11. **Self-review.** Every claim about behavior cites the file:line or symbol it came from. No "this function probably does X" without reading X.

Completion criterion: every §2–§7 entry is grounded in code actually read; §6 lists what was *not* read.

## Output Format

Seven labeled sections in order:

1. Purpose — What this code does
2. Flow — Actual call sequence: entry → calls → return, with branches and early returns noted
3. Logic — Conditions / decisions
4. Components — Functions / APIs / DB
5. Data Flow — Input → transform → store/return
6. Dependencies — Related modules / services; mark unread callees explicitly
7. Risks — Logical / data / concurrency

## Pitfalls

- **Explaining from the filename or symbol name.** `authenticateJWT` might not actually authenticate JWTs — read it.
- **Reading only the line the user named.** Most non-trivial behavior lives one or two hops away. Trace it.
- **Inventing a call graph.** If you didn't read the callee, say "not traced" in §6 — don't guess the return value.
- **Mixing business meaning with implementation jargon.** §1 is for stakeholders; §2–§5 are for engineers. Keep them separate.
- **Skipping concurrency.** Any code that reads-then-writes shared state is a risk. Name the variable and the race.
- **Stopping at the first early return.** The error paths are usually where the bugs live; list them in §2.

## Verification

- [ ] Source is named (file path / commit hash / symbol / inline paste)
- [ ] §1 reads as business behavior, not implementation
- [ ] §2 traces at least one hop beyond the entry point
- [ ] §3 quotes conditions whose wording matters
- [ ] §5 shows the data shape at input and at persistence/return
- [ ] §6 distinguishes read from not-read callees
- [ ] §7 cites the file:line or symbol for each risk
- [ ] Limitations section (or inline note) records any code that couldn't be read

## Rules

- No test cases
- No requirement analysis
- Concise and structured
