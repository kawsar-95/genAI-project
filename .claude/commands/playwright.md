---
description: Use when writing, extending, or repairing Playwright end-to-end tests or scripts for a web app - new specs, page objects, login and session setup, test data, or a Playwright test that fails or is flaky.
---

# Writing Playwright Tests

## Overview

Explore the real UI with `agent-browser`, write the test with the Page Object Model, then run it with `npx playwright test` until it passes. The work is done only when the test passes and you proved that its assertion can fail.

In this repo, the Playwright project is in `dmoney-web-react/` (web app on port 3000, API on port 5000). Run all `npx playwright` and `agent-browser --state` commands from that folder.

## Workflow

Do these steps in this order.

1. **Read the project.** Find `playwright.config.*`, the `pages/` folder, the setup files, and the specs. Use the same patterns.
2. **Explore with agent-browser.** Do the real flow in the browser, page by page. If the app is not running, start it as `webServer` in the config does.
   ```bash
   agent-browser --session explore --state e2e/<role>_auth.json open http://localhost:3000/<path>
   agent-browser --session explore snapshot -i        # roles and names -> locators
   agent-browser --session explore fill @e12 "100"     # snapshot again after each action
   agent-browser --session explore close
   ```
   - If no session file exists for the role, log in through the login page with agent-browser.
   - Use the names in the snapshot for `getByRole` and `getByLabel`.
   - Read the source only for what the browser cannot show: API endpoints, status codes, validation rules, seed data.
3. **Ask about ambiguity,** after step 2, with what you saw in the browser. If the request has 2 or more valid meanings, or the app does not match the request, stop. Ask with `AskUserQuestion`. Put the option you recommend first, with "(Recommended)" at the end of its label. Give each option a one-line effect. If you find a new ambiguity in a later step, ask the same way before you continue.
4. **Write the test** with the conventions below.
5. **Run it:** `npx playwright test <spec> --project=<project> --reporter=list`.
6. **If it fails, fix it.** Read the error, `test-results/**/error-context.md`, and the screenshot. Find the cause, fix the test, and run again. Repeat until it passes.
   - If the cause is in the app (a bug or a missing feature), stop and ask the user, with options.
   - Keep the assertions as strong as before. Change an expected value only when evidence shows that the expectation was wrong.
7. **Prove the assertion.** Change one expected value to a wrong value and run. The test must fail with a clear message. Restore the value, run again, and check `git diff`.
8. **Run cold.** If `webServer` starts the app and you started the running servers, stop your servers and run once more. If the user started them, skip this step and say so in the report.
9. **Report** the command, the result, and the files.

## Conventions

| Topic | Rule |
|---|---|
| Page objects | One class for each page in `e2e/pages/`. Locators are `readonly` fields set in the constructor. Methods do user actions: `cashIn(phone, amount)`. Specs hold the assertions. |
| Locators | `getByRole` or `getByLabel` with the snapshot names. Use `exact: true` for short names. Scope a repeated element by its container. |
| Sessions | One `<role>.setup.ts` for each role saves `storageState` to `e2e/<role>_auth.json`. One project for each role: specs in `tests/<role>/`, `dependencies: ['<role>-setup']`. Skip the login while the saved token is valid. Add `/e2e/*_auth.json` to `.gitignore`. |
| Login tests | Start logged out: `test.use({ storageState: { cookies: [], origins: [] } })`. |
| Waits | Use web-first assertions. For an action that calls an API, start `page.waitForResponse` before the click, then assert the status. Do not use `waitForTimeout`. |
| Assertions | Check the UI, the API response, and the result in the data (for example, a balance from the API). |
| Test data | Defaults in `e2e/test-data/`, overrides from `e2e/.env` through `process.loadEnvFile`. Check preconditions (balance, limits) first and fail with a message that says what to change. |
| Secrets | Tokens and passwords come from the environment, never from code or reports. |
| OTP by email | A util reads the newest OTP email. It skips an email older than the login or past its expiry, and polls until a new one arrives. |

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| A click does nothing on a cold `next dev` server | The click came before React hydration | Wait until the button has a `__reactProps$` key, or test a production build. |
| `getByRole('alert')` is always visible | The Next.js route announcer has `role="alert"` | Locate the alert component of the app, for example `.MuiAlert-root`. |
| A MUI Select is not found by its label | No `labelId` connects the label and the combobox | Scope the combobox by the form control that contains the label text. |
| `waitForResponse` resolves too early | It matched the CORS preflight `OPTIONS` request | Also match `res.request().method()`. |
| A rejected action passes the test | The API returns a 2xx code (for example 208) for a business error | Assert the exact status, for example `201`, not `ok()`. |
