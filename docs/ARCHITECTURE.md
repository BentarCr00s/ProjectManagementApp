# Architecture Overview

---

## 1. Project Overview

TaskSync is an MVP project management tool built with:

- **Express.js** — HTTP server and routing
- **Pug** — Server-side HTML templating
- **libSQL / Turso** — SQLite-compatible database
- **express-session + connect-sqlite3** — Session storage
- **Tailwind CSS** — Utility-first styling

**Pattern:** MVC with Server-Side Rendering (SSR) for page loads, supplemented by a REST API (`/api/*`) for async client interactions (drag-and-drop, modals, inline edits).

**Data hierarchy:** `Workspace → Space → List → Task → Subtask`

---

## 2. Request Lifecycle

### Page Request (SSR)

```
Browser
  → GET /workspaces/:id/lists/:listId/list
  → app.js middleware stack:
      1. morgan (logging)
      2. express.json / express.urlencoded (body parsing)
      3. express.static (serves public/)
      4. session middleware (loads session from sessions.db)
      5. setLocals (injects req.session.user → res.locals.user)
      6. requireAuth (checks req.session.userId; redirects to /login if absent)
      7. listRoutes middleware (validates list belongs to workspace)
  → listRoutes GET /:listId/list handler
  → taskModel.findByList(listId) — raw SQL → DB
  → res.render('pages/list-view', { tasks, ... })
  → Pug template compiled → HTML sent to browser
```

### API Request (async interaction)

```
Browser fetch()
  → PUT /api/tasks/:id/status
  → app.js middleware stack (steps 1–5 same as above)
  → apiRoutes.use(requireSession) — returns 401 JSON if not authenticated
  → validate(taskRules) middleware — returns 400 JSON if invalid
  → handler: taskModel.updateStatus(id, status) — raw SQL → DB
  → res.json(updatedTask)
  → Client JS updates the DOM
```

---

## 3. Authentication and Session

**Session storage:** `express-session` backed by `connect-sqlite3`, persisted to `sessions.db` in the project root. Cookie maxAge is 30 days; `httpOnly: true`; `secure: true` in production.

**`requireAuth` (page routes):**
- Defined in `src/middlewares/auth.js`
- Checks `req.session.userId`
- If missing: XHR/JSON requests get `401 JSON`; browser requests redirect to `/login`
- Applied globally in `app.js` after the auth routes, protecting all workspace/list/task/api routes

**`requireSession` (API routes):**
- Inline function in `apiRoutes.js` applied via `router.use(requireSession)`
- Always returns `401 JSON` (never redirects)

**`setLocals`:**
- Runs on every request before `requireAuth`
- Copies `req.session.user` to `res.locals.user`, making the current user available in all Pug templates without passing it explicitly in every `res.render()` call
- Also sets `res.locals.path = req.path` for active-link highlighting in the sidebar

**Login flow:**
1. `POST /login` validates credentials, calls `bcrypt.compare`
2. On success: sets `req.session.userId` and `req.session.user` (id, name, email, avatar_color)
3. Redirects to `/dashboard`

---

## 4. Database Layer

Defined in `src/config/db.js`.

**Lazy initialization:** `getDb()` is an async function that creates the DB connection on first call and caches it in a module-level variable `db`. Subsequent calls return the cached instance immediately.

```js
async function getDb() {
  if (!db) {
    const { connect } = await import('@tursodatabase/database');
    const url = process.env.TURSO_DATABASE_URL || 'local.db';
    db = await connect(url);
  }
  return db;
}
```

**`resetDb()`:** Sets `db = null`, forcing the next `getDb()` call to create a fresh connection. Used in test `beforeEach` hooks for test isolation.

**Query pattern:** All models use `db.prepare(sql).get(args)` (single row) or `db.prepare(sql).all(args)` (multiple rows), or `db.prepare(sql).run(args)` for mutations. Parameterized queries (`?` placeholders) are used throughout — no string interpolation of user input.

**Insert-then-select pattern:** After every `INSERT`, the model immediately does a `SELECT` to return the full hydrated row (including any DB-generated defaults and joined fields).

**URL routing by `NODE_ENV`:**
- `test` → `:memory:` (in-memory, reset between runs)
- development → `file:local.db`
- production → Turso cloud URL from `TURSO_DATABASE_URL`

---

## 5. SSR + API Hybrid

| Interaction | Approach |
|-------------|----------|
| Full page load | SSR via Pug templates; route handler fetches all needed data and calls `res.render()` |
| Create task | `POST /api/tasks` → JSON response → client JS inserts card into DOM |
| Update task status | `PUT /api/tasks/:id/status` → JSON → client JS moves card |
| Update task fields | `PUT /api/tasks/:id` → JSON → client JS updates detail panel |
| Drag-and-drop (Kanban) | Client JS → `PUT /api/tasks/:id/status` |
| Comments | `POST/PUT/DELETE /api/tasks/:id/comments` → JSON → client JS renders comment |
| Time tracking | `POST /api/tasks/:id/time/start|stop` → JSON → client JS updates timer display |
| Tags | `POST/DELETE /api/tasks/:id/tags` → JSON → client JS updates tag chips |
| Task detail modal | `GET /tasks/:id` with `Accept: application/json` → JSON → client JS renders modal |

The rule: anything that needs a full page context (navigation, first render) is SSR. Anything triggered by user interaction after the page loads goes through `/api/*`.

---

## 6. Validation

Defined in `src/middlewares/validate.js`.

`validate(rules)` returns an Express middleware. `rules` is a plain object keyed by field name; each value is a rule descriptor:

| Rule key | Effect |
|----------|--------|
| `required: true` | Fails if field is absent, null, or empty string |
| `minLength: N` | Fails if string length < N |
| `maxLength: N` | Fails if string length > N |
| `enum: [...]` | Fails if value is not in the array |
| `contains: 'x'` | Fails if string does not include `x` |
| `type: 'string'` | Fails if `typeof value !== 'string'` |

On failure: `res.status(400).json({ error: 'Validation failed', details: [...] })`

On success: calls `next()`.

**Pre-defined rule sets** exported from `validate.js`:
- `taskRules` — `title` (required, 1–255), `status` (enum), `priority` (enum)
- `workspaceRules` — `name` (required, 1–100)
- `listRules` — `name` (required, 1–100)
- `commentRules` — `content` (required, 1–5000)
- `authRules` — `email` (required, contains `@`), `password` (required, min 6), `name` (required, min 2)

There is no external validation library; the middleware is ~85 lines of plain JavaScript.

---

## 7. Tailwind Customization

Configured in `tailwind.config.js`.

**Separator:** `separator: '_'` — all variant prefixes use underscore instead of colon.

```html
<!-- Correct -->
<button class="hover_bg-brand-600 focus_ring-2">

<!-- Wrong (Tailwind won't generate these) -->
<button class="hover:bg-brand-600 focus:ring-2">
```

**Custom color tokens:**

| Token | Purpose |
|-------|---------|
| `brand-{50..950}` | Primary blue brand palette (base `#4070ff`) |
| `sidebar-{bg,hover,active,border,text,textActive}` | Dark sidebar colors |
| `surface-{DEFAULT,secondary,tertiary}` | Page background layers |
| `task-{todo,inprogress,review,done}` | Status indicator colors |
| `priority-{urgent,high,normal,low}` | Priority badge colors |

**Font:** Inter (with system-ui fallback).

**Custom shadows:** `card`, `card-hover`, `modal`, `sidebar`.

**Custom animations:** `slide-in`, `fade-in`, `scale-in` (all ~150–200ms ease-out).

---

## 8. Key Design Decisions

**No ORM — raw SQL with parameterized queries.**
Every model function in `src/models/` issues explicit SQL. This keeps the query surface visible and auditable, avoids ORM abstraction overhead, and fits naturally with libSQL's prepare/run API.

**Session-based auth, not JWT.**
Sessions are stored server-side in `sessions.db`. This makes invalidation (logout) immediate and simple. JWTs would require a token blacklist to achieve equivalent logout behavior.

**No external validation library.**
The custom `validate.js` middleware covers all cases present in the codebase (required, length, enum, contains). Adding a library like Joi or Zod would be worthwhile if the validation surface grows significantly.

**`mergeParams: true` on list router.**
`listRoutes.js` uses `express.Router({ mergeParams: true })` so handlers can access `:id` (workspace ID) from the parent `app.use('/workspaces/:id/lists', listRoutes)` mount point alongside `:listId`.

**Insert-then-select after mutations.**
All `create` and `update` model functions return the full row by running a `SELECT` after the write. This ensures the caller always gets a consistent, complete object including any DB defaults and joined fields (e.g., `assignee_name`).

**Cascading deletes at the DB layer.**
All foreign keys use `ON DELETE CASCADE` (or `SET NULL` for nullable references). Deleting a workspace removes all its spaces, lists, tasks, subtasks, comments, time entries, and tags without any application-level cleanup logic.
