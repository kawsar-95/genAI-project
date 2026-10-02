# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 15 (App Router, TypeScript, Material UI, Tailwind 4) frontend for **dMoney**, a mobile-financial-service (bKash/Nagad-style) QA practice platform. It talks to a separate Node/Express/MySQL backend (`dmoney-transaction-api`, not in this repo). `README.md` is actually a ~1,400-line BRD for the whole platform (roles, validation rules, limits, fees, error codes) — consult it for business rules rather than guessing. `api_doc/` has `API_ENDPOINTS.md` and Postman collections.

`dmoney-reactjs/` is the legacy Create React App version kept for reference during migration; it is not part of the Next.js build. `QUICK_START.md` is stale (references `dmoney-nextjs/`, `NEXTJS_MIGRATION.md`, `npm run lint`) — don't trust it.

## Commands

```bash
npm run dev      # next dev --turbopack
npm run build    # next build --turbopack
npm start        # next start on PORT=3006 (needs a prior build)
npm run prod     # build + start on 3006
```

There is no lint script, ESLint config, or test runner. Type-check with `npx tsc --noEmit`.

Env (`.env`, gitignored; template in `.env.example`): `NEXT_PUBLIC_API_URL` (backend base URL), `NEXT_PUBLIC_SECRET_KEY` (sent as `X-AUTH-SECRET-KEY`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Note `.env.example` sets `PORT=5000`, but `npm start` hard-codes 3006 via `cross-env`.

## Architecture

**Auth is split across three places that must stay in sync:**
- `src/app/login/page.tsx` — two-step login (`POST /user/login`; non-Admin roles get `otpRequired` and a 4-digit OTP step). It calls the backend with a raw `axios` instance (not `@/lib/api`) because no token exists yet. On success it fetches the user profile and writes `token`, `role`, `email`, `name`, `userId`, `phoneNumber`, `photo`, `balance` to **localStorage**, and writes the JWT to a **`token` cookie** with `max-age` derived from the JWT `exp`.
- `src/middleware.ts` — reads only the `token` cookie. Unauthenticated requests to anything outside the public list (`/login`, `/register`, `/`, `/forgot-password`, `/reset-password`) redirect to `/login`; a logged-in visit to `/login` redirects to `/profile`. It does **no role check** and does not validate the JWT.
- `src/lib/api.ts` — shared axios instance (`baseURL = NEXT_PUBLIC_API_URL`). Request interceptor decodes the JWT client-side, calls `clearSessionAndRedirect()` and cancels the request if expired, otherwise attaches `Authorization: Bearer` and `X-AUTH-SECRET-KEY`. Response interceptor logs out on 401 only; 403 is left to the page to show as an error (it means wrong role, not an expired session).

Any new session-state key stored at login must also be added to the `localStorage.removeItem` list in `clearSessionAndRedirect`. `DashboardLayout` and its logout handlers use `localStorage.clear()` instead.

**Role-based UI, not role-based routing.** Roles are Admin / Agent / Customer / Merchant (plus an internal System account). Routes are plain folders per role: `src/app/{admin,agent,customer,merchant}/<feature>/page.tsx`, plus shared `profile`, `change-password`, `register`, `forgot-password`, `reset-password`. Role gating is only:
- `LeftMenu.tsx` — `ROLE_MENUS` maps the `role` from localStorage to its sidebar items. **Adding a page means adding it here too.**
- Backend enforcement (403). Nothing on the frontend stops a Customer from typing `/admin/users`; each page only checks that a `token` exists in localStorage.

**Page conventions.** Every authenticated page is a `'use client'` component that wraps its content in `<DashboardLayout>` (`src/components/DashboardLayout.tsx`), which handles the AppBar, balance toggle (`GET /transaction/balance/:phone`), user menu, a 30s token-expiry poll, and renders `null` until localStorage auth is verified. Pages call the backend through `API` from `@/lib/api`, hold form state with `useState`, do inline field validation, and style with MUI `sx` and per-file style constants (e.g. `dashField`, `COLOR`) — there is no shared theme or form library, and the role color map is duplicated in `DashboardLayout` and `LeftMenu`. Reusable pieces live in `src/components` (`Pagination`, `SelfStatement` shared by the four `*/self-statement` pages, `PWAProvider`).

**Other:** `@/*` aliases `./src/*`. PWA is hand-rolled (`public/sw.js`, `public/manifest.json`, registered by `PWAProvider` from the root layout, which also injects Google Analytics). Stripe (`@stripe/react-stripe-js`) is used for the customer bank cash-in page only.

## Repo-local `.claude/` config

`.claude/` (agents, skills, hooks in `settings.json`) is QA tooling copied from a different repo (`hris-web-automation`: qa-agent, find-bug, test-design, etc.) and references a `testing_docs/` directory and Jira workflow that don't exist here. One hook does apply: `git add`/`commit`/`push` prompt for confirmation, and shell-indirection commands (`eval`, `sh -c`, `xargs`, `*.sh`) also prompt.
