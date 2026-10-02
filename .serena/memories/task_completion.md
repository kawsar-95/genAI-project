# Task completion

No automated tests, linter, or formatter exist in either app. Verify manually:

- **Web change**: `cd dmoney-web-react && npx tsc --noEmit`; for build-affecting changes also `npm run build`.
- **API change**: start with `npm run dev` and confirm the server boots without errors (models sync on load); exercise the touched endpoint with curl (examples in `endpoints.md`) — needs JWT + `X-AUTH-SECRET-KEY: ROADTOSDET` (from `.env.example` `PARTNER_KEY`).
- API CI (`.github/workflows/node.js.yml`) runs `npm test`, which doesn't exist → CI fails regardless; not a signal.
- If code structure changed notably, refresh graph: `graphify update .` (post-commit hook does this automatically if installed).
- Don't commit/push unless asked.
