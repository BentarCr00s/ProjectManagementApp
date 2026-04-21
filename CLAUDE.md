# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start with Nodemon (hot reload)
npm run watch:css    # Watch and recompile Tailwind CSS

# Initial setup (new environment)
npm run setup        # Runs migrate + build:css

# Database
npm run migrate      # Run schema migrations

# Testing
npm test             # Jest unit/integration tests
npm run test:watch   # Jest in watch mode
npm run test:e2e     # Playwright E2E tests (auto-starts server on port 3000)
npm run test:e2e:ui  # Playwright with interactive UI
```

## Environment Variables

Required in `.env`:
- `TURSO_DATABASE_URL` — Turso/libSQL connection string (use `file:local.db` for local SQLite)
- `SESSION_SECRET` — Session encryption key
- `PORT` — Server port (default 3000)

For tests, the DB connection auto-switches to `:memory:` when `NODE_ENV=test`.

## Architecture

**Pattern:** MVC with Server-Side Rendering (SSR) + REST API hybrid.

**Data hierarchy:** Workspace → Space → List → Task → Subtask

**Request flow:**
- Page renders: Browser → Express routes → Models (raw SQL via `@libsql/client`) → Pug templates
- Interactive updates (Kanban drag-drop, inline edits): Client JS (`public/js/`) → `POST/PUT /api/*` routes → Models → JSON response → DOM update

**Key layers:**
- `src/app.js` — Express entry point, middleware registration, route mounting
- `src/config/db.js` — Lazy DB init via `getDb()`. Exports `resetDb()` for test isolation. Supports Turso cloud, local file (`local.db`), or in-memory (`:memory:`)
- `src/config/migrate.js` — Full schema (9 tables with FK cascade deletes)
- `src/models/` — Raw SQL query functions; no ORM
- `src/routes/apiRoutes.js` — REST endpoints consumed by client-side JS
- `src/middlewares/auth.js` — `requireAuth`, `requireGuest`, `setLocals` (injects `currentUser` into all Pug templates)
- `src/views/mixins/` — Reusable Pug components (task cards, buttons, etc.)

**Tailwind config note:** Uses underscore `_` as separator instead of the default `:` for responsive/state variants (e.g., `hover_shadow-md` not `hover:shadow-md`). Custom color tokens: `brand`, `sidebar`, `surface`, `task` (status colors), `priority` (urgency colors).

**Auth:** Session-based (express-session + connect-sqlite3 stored in `sessions.db`), not JWT.

**Task statuses:** `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`  
**Task priorities:** `urgent`, `high`, `normal`, `low`  
**Time fields:** `time_estimate` (hours), `time_tracked` (seconds)

## Documentation

All detailed documentation lives in the `docs/` directory:
- [`docs/API.md`](docs/API.md) — Complete REST API reference
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — Database schema and entity relationships
- [`docs/SETUP.md`](docs/SETUP.md) — Developer environment setup
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Architecture decisions and patterns
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — How to add features and contribute
