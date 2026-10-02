# dmoney-web-react — core

Full guide: `dmoney-web-react/CLAUDE.md`. `QUICK_START.md` is stale — ignore. API docs: `api_doc/API_ENDPOINTS.md` + Postman collections.

## Layout
- `src/app/{admin,agent,customer,merchant}/<feature>/page.tsx` + shared `login`, `register`, `profile`, `change-password`, `forgot-password`, `reset-password`.
- `src/components/` — `DashboardLayout`, `LeftMenu`, `Pagination`, `SelfStatement` (shared by 4 `*/self-statement` pages), `PWAProvider`.
- `src/lib/api.ts` — shared axios instance; `src/middleware.ts` — cookie route guard. `@/*` → `./src/*`.

## Invariants
- Auth spread across 3 files that must stay in sync: `login/page.tsx` (raw axios, writes localStorage keys + `token` cookie), `middleware.ts` (only checks `token` cookie exists; no role/JWT validation), `lib/api.ts` (client-side exp check, attaches `Authorization` + `X-AUTH-SECRET-KEY`; logs out on 401 only, 403 left to page).
- New localStorage session key at login → also add to `removeItem` list in `clearSessionAndRedirect` (`lib/api.ts`).
- Role gating is UI-only: `ROLE_MENUS` in `LeftMenu.tsx`. New page → add menu entry there. Backend enforces with 403.
- Role color map duplicated in `DashboardLayout` and `LeftMenu`.
- Stripe only on customer bank cash-in page. PWA hand-rolled (`public/sw.js`, `public/manifest.json`).
