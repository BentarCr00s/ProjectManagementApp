# Developer Setup Guide

Step-by-step instructions for running the ClickUp Replica locally from scratch.

---

## Prerequisites

- **Node.js 18+** (no `engines` field in `package.json`; tested on Node 18)
- **npm** (bundled with Node)
- Git (to clone the repo)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TURSO_DATABASE_URL` | Yes | `file:local.db` | Database connection string |
| `TURSO_AUTH_TOKEN` | Only for Turso Cloud | _(empty)_ | Turso auth token |
| `SESSION_SECRET` | Yes | _(example value)_ | Secret key for session signing — change in production |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment (`development` · `production` · `test`) |

### Database modes

**Local development (no cloud account needed):**
```env
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
```
This creates a `local.db` SQLite file in the project root.

**Turso Cloud:**
```env
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your_token_here
```
Sign up at [turso.tech](https://turso.tech) and create a database to get these values.

---

## 3. Initialize the Database and Build CSS

```bash
npm run setup
```

This runs two commands in sequence:
1. `npm run migrate` — creates all tables and indexes in the database
2. `npm run build:css` — compiles Tailwind CSS to `public/css/styles.css`

---

## 4. Start Development

Open **two terminals**:

**Terminal 1 — Express server with hot reload:**
```bash
npm run dev
```

**Terminal 2 — Tailwind CSS watcher:**
```bash
npm run watch:css
```

The app is available at **http://localhost:3000**.

> If you only run `npm run dev` without `npm run watch:css`, CSS changes in Pug templates will not be picked up until you manually run `npm run build:css`.

---

## 5. Running Tests

**Unit and integration tests (Jest):**
```bash
npm test
```

**Jest in watch mode:**
```bash
npm run test:watch
```

**End-to-end tests (Playwright):**
```bash
# Ensure the dev server is running on port 3000 first
npm run test:e2e
```

**Playwright with interactive UI:**
```bash
npm run test:e2e:ui
```

> E2E tests require the development server to already be running on port 3000.

---

## 6. Other Scripts

| Script | What it does |
|--------|--------------|
| `npm start` | Start the server without hot reload |
| `npm run migrate` | Re-run database migrations |
| `npm run build:css` | One-time Tailwind CSS build |

---

## Tailwind CSS Note

This project uses `_` as the separator for Tailwind variants instead of the default `:`. This is configured via `separator: '_'` in `tailwind.config.js`.

```html
<!-- Correct -->
<div class="hover_text-blue-500 dark_bg-gray-800">

<!-- Wrong — colon won't work -->
<div class="hover:text-blue-500 dark:bg-gray-800">
```

---

## Common Issues

**`sessions.db` errors on startup**
Ensure the process has write permission in the project root directory. The session store creates `sessions.db` automatically on first run.

**CSS not updating**
Run `npm run watch:css` in a separate terminal. The Express server does not compile CSS.

**E2E tests failing immediately**
Make sure the dev server is running on port 3000 (`npm run dev`) before executing `npm run test:e2e`.

**Database already exists / migration conflict**
All `CREATE TABLE` statements use `IF NOT EXISTS`, so re-running migrations is safe.

**`NODE_ENV=test` behavior**
When running tests, `TURSO_DATABASE_URL` is automatically set to `:memory:`, giving each test run a fresh in-memory database. `resetDb()` in `src/config/db.js` clears the cached connection between test suites.
