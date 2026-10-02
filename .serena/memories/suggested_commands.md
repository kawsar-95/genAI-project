# Suggested commands (Linux)

Run inside the relevant subproject; there is no root package.json.

## API (`dmoney-transaction-api/`)
- `npm install`; `npm run dev` (nodemon) / `npm start` → http://localhost:5000
- Requires `.env` and `.env.dev` (copy `.env.example`; DB creds must match local MySQL).
- One-off migration: `node migrations/<file>.js`
- Manual email scripts: `node tests/sendPersonalEmail.test.js <email>` (not a test suite).
- OTPs/reset tokens are printed to the API console.

## Web (`dmoney-web-react/`)
- `npm install`; `npm run dev` → http://localhost:3000
- `npm run build`; `npm start` (port 3006, needs build); `npm run prod`
- Type-check: `npx tsc --noEmit`

## DB
- Import dump on Linux: rename lowercase tables first (sed snippet in root `README.md`), then `mysql -u root -p dmoneydb < dump-fixed.sql`. Empty DB is fine — API seeds on start.

## graphify
- `graphify update .` (refresh), `graphify explain "X"`, `graphify path "A" "B"`; `graphify hook install` after every fresh clone (hooks + merge driver are local).
