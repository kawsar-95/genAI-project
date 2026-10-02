# Conventions

## API (JS, CommonJS)
- `require`/`module.exports`; controllers export handlers as `exports.handleX = async (req, res, next) => {...}`.
- Routes: `router.<verb>('/resource/action', authenticateJWT, controller.handler)` in `routes/*.route.js`; controller files named `<name>.controller.js`.
- Responses: `res.status(code).json({ message: '...' })`; validate numeric amounts with `Number(...)` + `Number.isFinite`.
- 4-space indent; section comments like `// ── Title ────`; aligned `=` in grouped const declarations.
- Authorization in money endpoints: compare `req.user.identifier` to from_account's `phone_number`/`email`, 403 otherwise.
- Transaction IDs via `services/generateTrnxId.js`.

## Web (TS/TSX)
- Authenticated pages: `'use client'`, wrapped in `<DashboardLayout>`, call backend via `API` from `@/lib/api`, `useState` form state, inline validation.
- Styling: MUI `sx` + per-file style constants (e.g. `dashField`, `COLOR`); no shared theme, no form library.
- Imports via `@/` alias.

## Repo
- Commit messages: conventional style (`chore:`, `docs:`, `fix:`).
- Subproject `.claude/settings.json` hooks prompt on `git add/commit/push` and shell indirection (`eval`, `sh -c`, `xargs`, `*.sh`).
