# Tech stack

- Node.js 20.x (CI matrix), npm (package-lock per subproject). MySQL 8.x DB `dmoneydb`.
- **API** (`dmoney-transaction-api`, CommonJS JavaScript, no TS): Express 4, Sequelize 6 + mysql2, jsonwebtoken, joi, multer, nodemailer + googleapis (email), stripe, swagger-jsdoc/swagger-ui-express (+ YAML specs), custom-env + dotenv, nodemon (dev).
- **Web** (`dmoney-web-react`): Next.js 15.5 App Router with Turbopack, React 19.1, TypeScript 5, MUI 7 (+ emotion), Tailwind 4 (postcss), axios, @stripe/react-stripe-js, cross-env.
- **Legacy web** (`dmoney-reactjs`): CRA (react-scripts 5), React 18, MUI 6, react-router 6. Reference only.
- No test framework, linter, or formatter configured in API or Next app.
- Tooling: graphify (`uv tool install graphifyy`), Serena (TypeScript language server active).
