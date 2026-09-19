---
name: validate-bug
description: "Validate a bug with 3-layer evidence: black/grey/white box."
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [qa, bug-validation, evidence, root-cause, sdet, debugging]
    related_skills: [find-bug, analyze-rootcause, explain-code, test-design]
---

# Bug Validator — 3-Layer Investigation Framework

Prove a bug beyond doubt at every layer of the system so the fix is undeniable and the bug report is bulletproof. Layer 1 is witness testimony (what the system does), Layer 2 is the forensic test (reproduce in a controlled environment), Layer 3 is the DNA evidence (the exact line of code that is guilty). A bug without all three layers is a suspicion, not a proof.

The body below is the full procedure. The sections that follow it (`When to Use`, `Prerequisites`, `How to Run`, `Quick Reference`, `Pitfalls`, `Verification`) wrap the SOP for the skill loader; the SOP itself is the canonical contract.

## When to Use

- A user reports a symptom and asks "is this a bug?" / "validate this" / "prove this"
- Writing a Jira/Linear/GitHub-Issues bug report that needs to survive engineering review
- Debugging a wrong response from an API, SDK call, presigned URL, or stored value
- Tracing a black/grey/white-box investigation across system layers
- After `find-bug` surfaces a candidate that needs deeper proof before being filed

**Don't use for:** open-ended bug hunting (use `find-bug` — it scans broadly), root-cause analysis of a single failing test trace (use `analyze-rootcause`), explaining how a known-buggy code section works (use `explain-code`), or writing test cases (use `test-design`).

## Prerequisites

- A concrete symptom to validate: an endpoint/function/module that misbehaves, expected vs actual behavior, the environment it was observed in, and any error code or log snippet available.
- For Layer 2 (grey-box): partial source access or the ability to instrument the SDK/integration boundary.
- For Layer 3 (white-box): full read access to the source file containing the bug. If unavailable, produce an `[INFERRED]` root-cause block based on Layer 2 evidence and keep status `UNCONFIRMED`.
- **The adversarial review skill `qa-agent-advocate` must be available** before any `CONFIRMED` status sticks. Per the SOP, this skill produces a claim, not a verdict — the verdict comes from `qa-agent-advocate` challenging each layer's evidence. Without it, hold status at `UNCONFIRMED` regardless of how strong the three layers look.

## How to Run

Use this skill inside any Hermes session by referencing it (`skill_view(name='validate-bug')` first if uncertain). Output lands in `testing_docs/<KEY>.bug.md` when a Jira ticket is given (one finding, using `find-bug`'s field shape), otherwise in the reply. The SOP body below is the procedure — read it end to end before producing any output.

## Quick Reference

- **Output target** — `testing_docs/<KEY>.bug.md` (one finding, `find-bug` shape) when a Jira ticket key is present; otherwise deliver in the reply.
- **Three layers, all required** — Layer 1 black-box symptom + repro, Layer 2 grey-box integration interception, Layer 3 white-box code proof. A layer you could not execute is a layer you did not run; status stays `UNCONFIRMED`.
- **Status** — `CONFIRMED` only when all three layers produced evidence AND `qa-agent-advocate` has challenged the claim. `UNCONFIRMED` (some layer missing) or `CANNOT REPRODUCE` (no defect at the system boundary).
- **Severity** — `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`, contextual to the feature (a presigned URL bug in photo upload is HIGH; in payment storage is CRITICAL).
- **QA Summary** — mandatory, copy-paste-ready for the bug tracker, no editing required.
- **Fix Verification Steps** — kept with the finding; testers run them after the fix ships.
- **Reference ID** — `BUG-[MODULE]-[YYMMDD]` when no ticket key is given; used inside the report, never as a filename.
- **File write** — `find-bug`/`test-design`/`validate-bug` all share `testing_docs/<KEY>.bug.md`. Append, never overwrite.

---

# Bug Validator — 3-Layer Investigation Framework (SOP body)

You are a **Senior SDET and System Architect** performing a structured bug validation. Your job
is not just to find a bug — it's to **prove it beyond doubt**, at every layer of the system,
so that the fix is undeniable and the bug report is bulletproof.

Think of this like a courtroom case. Layer 1 is the witness testimony (what the system does).
Layer 2 is the forensic test (reproduce it in a controlled environment). Layer 3 is the DNA
evidence (the exact line of code that is guilty).

A bug without all three layers is a suspicion, not a proof.

---

## Pre-Investigation Checklist

Before starting, extract or ask for:

| Item | Why It Matters |
|---|---|
| Endpoint / function / module name | Scopes the investigation |
| Expected behavior | Defines "correct" |
| Actual behavior | Defines "broken" |
| Environment (dev/staging/prod) | Determines reproduction path |
| Language + SDK/framework + version | Determines Layer 3 mechanics |
| Error code or log snippet | Anchors Layer 1 |

If the user has provided code, a URL, or a log — **infer as much as possible** and state
your assumptions at the top. Do not ask for what you can derive.

---

## Layer 1 — Black Box: System Behavior

**Goal:** Prove the bug exists from the *outside*, without touching the code.
Observe the system as a QA engineer with no source access would.

**First, establish which build you are validating against.** Record the branch and commit, and confirm the code the report concerns is actually in that tree — a report about a feature branch, validated against the baseline, produces a "not reproducible" verdict that means nothing. If the implementation is not present, stop and say so; do not report `NOT A BUG` from the wrong tree.

### What to do:

**Step 1 — Identify the observable symptom**
State the symptom in one sentence:
> *"Calling `POST /endpoint` with valid input returns `X`, but `Y` is expected."*

**Step 2 — Define the reproduction steps**
Write numbered, copy-paste-ready steps. No ambiguity. Include:
- The exact API call / UI action / CLI command
- The exact input (sanitized if needed)
- What to look at in the response

**Step 3 — Provide the verification command**
Give a `bash` or `curl` command that extracts the proof from the response.

```bash
# Example: extract a specific param from a URL
echo "PASTE_URL_HERE" | grep -oP 'PARAM_NAME=\K[^&]+'

# Example: make the actual failing call and capture the error
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg \
  -v 2>&1 | grep -A5 "< HTTP"
```

**Step 4 — State the expected vs actual output**

| | Value |
|---|---|
| **Expected** | e.g., `300` (seconds) |
| **Actual** | e.g., `1748000000000` (epoch ms) |

**Layer 1 Conclusion:**
> *"System behavior confirms the bug. The symptom is reproducible via [method] and produces
> [actual result] instead of [expected result]."*

---

## Layer 2 — Grey Box: Reproduce in Real Form

**Goal:** Reproduce the bug in a **controlled, isolated script** that intercepts the system
at the integration point — confirming *what the code is actually sending/receiving*, not just
what the API returns.

This is the "grey box" layer: you have partial source access and can instrument the integration
boundary without modifying production logic.

### What to do:

**Step 1 — Identify the integration boundary**
Find the exact point where:
- Your code calls an SDK, library, or external service
- A value is passed that controls the behavior

**Step 2 — Write an interception script**

Write a minimal, runnable script that:
- Intercepts or monkey-patches the SDK/library call
- Logs the *exact value and type* of the suspect parameter
- Generates the output so you can inspect it

```javascript
// Pattern: intercept SDK method to log actual params
const original = SDK.prototype.method;
SDK.prototype.method = function(action, params) {
  console.log('Param value:', params.suspectField);
  console.log('Param type:', typeof params.suspectField);
  console.log('Is Date?:', params.suspectField instanceof Date);
  return original.call(this, action, params);
};
```

```python
# Pattern: Python mock intercept
from unittest.mock import patch

with patch('module.SdkClass.method') as mock_method:
    mock_method.side_effect = lambda *args, **kwargs: (
        print(f"Param: {kwargs.get('suspect_field')}, Type: {type(kwargs.get('suspect_field'))}"),
        original_method(*args, **kwargs)
    )[-1]
```

**Step 3 — Document the output**

Show the actual printed output from the script:

```
SuspectField value: 2026-05-19T10:35:00.000Z ← what the code passes
SuspectField type: object ← should be number
SuspectField instanceof Date: true ← confirmed wrong type
```

**Layer 2 Conclusion:**
> *"Interception confirms [field/param] is passed as [wrong type/value] at the SDK boundary.
> This is not a network issue or environment issue — the bug is in application code."*

---

## Layer 3 — White Box: Code Proof

**Goal:** Point to the **exact line** that is wrong, explain *why* it's wrong at the
language/SDK/runtime level, and show the fix.

### What to do:

**Step 1 — Pin the exact location**

```
File: src/util/services/SomeService.ts
Line: 52
Function: getPresignedUrl()
```

**Step 2 — Show the buggy code with annotation**

```typescript
// ❌ BUG — Line 52
Expires: new Date(Date.now() + 300000), // Date object passed — WRONG TYPE
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// aws-sdk v2 expects: number (seconds)
// Got: Date object → coerces to epoch ms → ~1748000000000
// SDK arithmetic: signingTime + expires * 1000 → NaN or massive future time
```

**Step 3 — Explain the root cause at the SDK/runtime level**

Be specific about *why* the wrong value causes the wrong behavior. Don't just say "wrong type."
Trace the execution:

> `aws-sdk v2` receives `Expires` as a `Date` object. Internally it computes
> `signingTime + expires * 1000`. JavaScript coerces a `Date` to its epoch millisecond value
> (~`1748000000000`) during arithmetic. The result is a signing window of ~55 years, which
> AWS rejects as invalid → `403 AccessDenied: Request has expired`.

**Step 4 — Show the fix**

```typescript
// ✅ FIX — Line 52
Expires: 300, // number in seconds — correct for aws-sdk v2
```

Explain the fix:
> `Expires: 300` tells the SDK the URL is valid for 300 seconds (5 minutes) from signing time.
> The SDK's internal arithmetic now correctly computes `signingTime + 300 * 1000`.

**Step 5 — Note any related risk (if applicable)**
> If upgrading to `aws-sdk v3`, the param is `expiresIn` (not `Expires`) and still expects seconds.
> Verify on upgrade.

**Layer 3 Conclusion:**
> *"Root cause confirmed. Single-line fix. No architectural change required."*

---

## Where this output goes

This skill proves a single bug in depth. It does not own a file of its own — it feeds the same three-file set the `test-design` and `find-bug` skills use, so a ticket never ends up with competing bug documents.

**With a Jira ticket** — the proof belongs in `testing_docs/<KEY>.bug.md`, as one finding, using `find-bug`'s field set. Map onto it rather than inventing a parallel shape:

| This skill | Goes into the bug file as |
|---|---|
| Layer 1 symptom + reproduction commands | `Steps to reproduce`, `Expected result`, `Actual result` — black box only |
| Layer 2 integration reproduction | `Evidence` |
| Layer 3 code proof (`file:line`, quoted code, root cause) | `Evidence` — never in the reproduction steps |
| Severity `CRITICAL/HIGH/MEDIUM/LOW` | `Priority`, same four levels |
| Status `CONFIRMED` | `Status: NEW BUG` or `EXISTING BUG`, decided against the baseline branch |
| Status `UNCONFIRMED` / `CANNOT REPRODUCE` | `Status: UNDETERMINED`, with the missing verification named |
| Fix Verification Steps | keep them — they are what a tester runs after the fix ships |

Do not create a `BUG-<MODULE>-<DATE>.md` file. Use that generated id inside the report when no ticket exists; it is a reference, not a filename.

If the file already exists, add this finding to it rather than overwriting. You have no `Write` tool — write through `Bash` with a quoted heredoc (`cat > 'path' <<'ENDOFDOC'`), then verify the result.

**Without a ticket** — no file. Deliver the report in the reply.

**Either way, it is a claim until challenged.** A proof this detailed is persuasive, which is exactly why it goes to `qa-agent-advocate` before anyone calls it confirmed — three layers of evidence for a behavior that turns out to be intended is still a false positive. If the advocate rejects it, the finding leaves the bug file and the argument is recorded in `testing_docs/<KEY>.review.md` under E6, so it is not re-derived later.

## Output Format

Produce the full report in this structure:

---

### 🔍 Bug Investigation Report

**Bug ID / Reference:** *(ticket number, or generate one: `BUG-[MODULE]-[YYMMDD]`)*
**Reported By:** *(if known)*
**Environment:** *(dev / staging / prod / all)*
**Severity:** CRITICAL / HIGH / MEDIUM / LOW
**Status:** CONFIRMED / UNCONFIRMED / CANNOT REPRODUCE

---

### Assumptions
> State what was inferred from context. What is assumed about the stack, version, environment.

---

### 🟥 Layer 1 — System Behavior (Black Box)

**Symptom:**
> One-sentence observable description.

**Reproduction Steps:**
1. ...
2. ...
3. ...

**Verification Command:**
```bash
# paste-ready command
```

**Evidence:**
| | Value |
|---|---|
| Expected | `...` |
| Actual | `...` |

**Layer 1 Verdict:** Bug confirmed at system boundary / Not confirmed (explain why)

---

### 🟧 Layer 2 — Integration Reproduction (Grey Box)

**Integration Point:** *(which SDK call / service boundary)*

**Interception Script:**
```language
// minimal runnable script
```

**Script Output:**
```
actual console output showing the wrong value/type
```

**Layer 2 Verdict:** Bug confirmed at code-to-SDK boundary / Inconclusive (explain)

---

### 🟩 Layer 3 — Code Proof (White Box)

**File:** `path/to/file.ts`
**Line:** `52`
**Function:** `methodName()`

**Buggy Code:**
```language
// annotated buggy line
```

**Root Cause:**
> Technical explanation of why the wrong value causes the observed failure.

**Fix:**
```language
// corrected line
```

**Fix Explanation:**
> Why this fix works at the SDK/runtime level.

**Side Effects / Risks of Fix:**
> None / or: list anything to watch for.

---

### 📋 QA Summary *(copy-paste ready for bug tracker)*

> **Symptom:** [one sentence]
> **Root Cause:** [one sentence, file + line]
> **Fix:** [one sentence]
> **Verification:** [how to confirm fix works]

---

### ✅ Fix Verification Steps
Steps a QA engineer should follow *after* the fix is deployed to confirm it works:
1. ...
2. ...
3. ...

---

## Behavior Rules

1. **Never skip a layer.** If you can't fully execute a layer (e.g., no access to code),
   explicitly say so and provide what the layer *would* look like with a template.
2. **A layer you could not execute is not a proven layer.** Say which command was never run,
   and keep the status `UNCONFIRMED` rather than `CONFIRMED`. Three templates are not three layers.
3. **Check the expectation before proving the deviation.** A deviation from what you assumed,
   rather than from a requirement, contract, or established behavior, is not a bug however well
   evidenced — confirm the expected behavior first, and say where it came from.

4. **Scripts must be runnable.** Every script in Layer 2 must be copy-paste executable.
   No pseudocode. No `// implement this yourself`.

5. **Root cause must be mechanistic.** Don't say "wrong type was passed." Say *why* that
   wrong type causes *that specific failure* in *that specific SDK/runtime version*.

6. **Severity is contextual.** A presigned URL bug in a photo upload feature is HIGH.
   The same bug in a payment receipt storage is CRITICAL. Ask if context is unclear.

7. **The QA Summary is mandatory.** It must be copy-paste ready for Jira/Linear/GitHub Issues.
   No editing required by the user.

8. **If Layer 3 is unavailable** (no source access), produce a "suspected root cause" block
   with the most likely code pattern based on the Layer 2 evidence, and mark it `[INFERRED]`.

---

## Common Bug Patterns Reference

Use these as accelerators when the symptom matches:

| Symptom | Likely Layer 3 Cause |
|---|---|
| SDK receives wrong type (Date vs number) | JS type coercion, missing `.getTime()` or literal number |
| 403 on presigned URL | Wrong `Expires` type, clock skew, wrong region |
| Pagination returns same page repeatedly | `offset` not incremented, `cursor` not updated |
| Intermittent null pointer | Race condition, async result not awaited |
| Config value ignored | Wrong env var name, `.env` not loaded, precedence issue |
| JWT always expired | `exp` set in milliseconds instead of seconds |
| Event not firing | Listener attached after event emitted, wrong event name |
| DB write succeeds but data not visible | Missing `await`, transaction not committed |
| CORS error in prod only | Hardcoded dev origin in allowlist |
| Memory growing over time | Event listener not removed, interval not cleared |

---

## Pitfalls

- **Skipping a layer when access is missing.** Three templates are not three layers. If you can't execute a layer, say so and keep `Status: UNCONFIRMED` — three plausible-looking placeholders produce a "confirmed" verdict that means nothing.
- **Reporting a deviation from your assumption as a bug.** Confirm the expected behavior first against a requirement, contract, or established behavior. A deviation from what you guessed the contract was, however well evidenced, is not a bug.
- **Pseudocode in Layer 2.** The interception script must be copy-paste-runnable. `// implement this yourself` is not a script.
- **Stating "wrong type" without the mechanism.** Root cause must trace through the SDK/runtime: *which* coercion, *which* arithmetic, *which* version. "Wrong type was passed" is not a root cause.
- **Writing reproduction steps that name internal functions or file paths.** Reproduction is black-box — actor, setup, external action, input, wrong result. Code-level facts go in `Evidence`.
- **Picking severity from impact class, not from feature context.** A presigned URL bug in photo upload is HIGH; in payment storage is CRITICAL. Severity is contextual; ask when unclear.
- **Skipping the QA Summary.** The QA Summary is mandatory and copy-paste-ready. No editing by the user.
- **Setting `Status: CONFIRMED` without adversarial review.** Per the SOP, this skill produces a *claim*; the *verdict* comes from `qa-agent-advocate`. Without it, hold at `UNCONFIRMED` regardless of evidence strength.
- **Creating a `BUG-<MODULE>-<DATE>.md` file.** The bug file is `testing_docs/<KEY>.bug.md`, shared with `find-bug` and `test-design`. The generated id is a reference inside the report, never a filename.
- **Overwriting an existing `*.bug.md`.** Append this finding to it. Three skills share that file; overwriting breaks the others.
- **Claiming a finding is `NEW BUG` without comparing against the baseline.** `NEW BUG` vs `EXISTING BUG` is decided against the baseline branch, not assumed.
- **Verifying the wrong tree.** Confirm the implementation is actually in the tree being validated. A report about a feature branch validated against the baseline produces a meaningless "not reproducible."

## Verification

- [ ] Build being validated (branch, commit, dirty/clean, behind remote) recorded at the top
- [ ] Pre-investigation checklist completed or assumptions stated at the top
- [ ] Layer 1 produces an observable symptom, numbered reproduction steps, paste-ready verification command, and expected vs actual table
- [ ] Layer 2 interception script is copy-paste-runnable (no pseudocode, no `// TODO`) and its output is recorded verbatim
- [ ] Layer 3 pins file:line + function, quotes the buggy line, traces the mechanistic root cause at the SDK/runtime level, and shows the fix with explanation
- [ ] Where Layer 3 is unavailable, root cause is `[INFERRED]` from Layer 2 evidence, not invented
- [ ] Severity is contextual to the feature, not generic
- [ ] QA Summary present and copy-paste-ready (symptom / root cause / fix / verification, one sentence each)
- [ ] Fix Verification Steps present — concrete actions a tester runs after the fix ships
- [ ] Reproduction steps contain no internal function names, file paths, line numbers, SQL, or shell commands; code-level facts live in `Evidence`
- [ ] Expected behavior cited from a requirement, contract, or established behavior — not assumed
- [ ] Status is `CONFIRMED` only after `qa-agent-advocate` challenged the claim; otherwise `UNCONFIRMED` or `CANNOT REPRODUCE`
- [ ] Reference ID used inside the report is `BUG-[MODULE]-[YYMMDD]` (or the ticket key); never a filename
- [ ] Output lands in `testing_docs/<KEY>.bug.md` (appended, not overwritten) when a ticket is given, otherwise in the reply
- [ ] Companion file (`<KEY>.test.md` / `<KEY>.review.md`) was read before appending, so existing findings and rejected candidates are not re-derived
