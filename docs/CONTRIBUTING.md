# Contributing Guide

---

## Code Style

- **Module system:** CommonJS (`require` / `module.exports`). Do not use ES module `import`/`export` syntax in source files.
- **Strict mode:** Every file starts with `'use strict';`.
- **DB access:** Always use `const db = await getDb();` at the start of a model function. Never import `db` as a singleton at module scope.
- **Queries:** Use `db.prepare(sql).get(args)` for single rows, `.all(args)` for multiple rows, `.run(args)` for writes. Always use `?` placeholders — never interpolate user input into SQL strings.
- **IDs:** Use `uuidv4()` from the `uuid` package for all new record IDs.
- **Error handling:** Route handlers wrap logic in `try/catch`. Page routes send `res.status(500).send('Internal Server Error')`; API routes send `res.status(500).json({ error: 'Internal server error' })`.
- **Tailwind variants:** Use `_` as the separator (e.g., `hover_bg-brand-600`), not `:`.

---

## Adding a New Feature

Follow this order to keep the codebase consistent:

### 1. Add model function(s) in `src/models/`

```js
// src/models/myModel.js
'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const myModel = {
  async create({ field }) {
    const db = await getDb();
    const id = uuidv4();
    await db.prepare('INSERT INTO my_table (id, field) VALUES (?, ?)').run(id, field);
    return db.prepare('SELECT * FROM my_table WHERE id = ?').get(id);
  },
};

module.exports = myModel;
```

Key conventions:
- After every `INSERT`, immediately `SELECT` to return the full hydrated row.
- Use allowed-fields whitelisting in `update()` functions to prevent mass-assignment.

### 2. Add validation rules to `src/middlewares/validate.js`

```js
const myRules = {
  field: { required: true, minLength: 1, maxLength: 100 },
};

module.exports = { validate, taskRules, workspaceRules, listRules, commentRules, authRules, myRules };
```

### 3. Add route handler(s)

**For a page route** — add to the relevant route file (or create a new one and mount it in `app.js`):

```js
// src/routes/myRoutes.js
'use strict';
const express = require('express');
const myModel = require('../models/myModel');
const router = express.Router();

router.get('/my-page', async (req, res) => {
  const data = await myModel.findAll();
  res.render('pages/my-page', { title: 'My Page', data });
});

module.exports = router;
```

Mount in `src/app.js` after the `requireAuth` middleware:

```js
const myRoutes = require('./routes/myRoutes');
app.use(requireAuth);
app.use('/my-feature', myRoutes);
```

**For an API route** — add directly to `src/routes/apiRoutes.js`:

```js
const { validate, myRules } = require('../middlewares/validate');

router.post('/my-resource', validate(myRules), async (req, res) => {
  try {
    const item = await myModel.create({ field: req.body.field });
    res.status(201).json(item);
  } catch (error) {
    console.error('API create my-resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 4. Add a Pug template (page routes only)

- Create `src/views/pages/my-page.pug`
- Extend the main layout: `extends ../layouts/main`
- The `user` variable (current user) is available in all templates via `res.locals` — no need to pass it from the route handler.

### 5. Add client JS (API routes only)

Add interaction logic to `public/js/app.js`. Use `fetch()` to call the API endpoint and update the DOM with the JSON response.

### 6. Add a migration (new table only)

If the feature requires a new database table:

1. Add the `CREATE TABLE IF NOT EXISTS` statement to `src/config/migrate.js`
2. Add any needed indexes
3. Re-run `npm run migrate`

---

## Testing Requirements

### Unit tests

Add unit tests for every new model function in `tests/unit/models/`.

```js
// tests/unit/models/myModel.test.js
const myModel = require('../../../src/models/myModel');
const { resetDb } = require('../../../src/config/db');

beforeEach(() => resetDb());

test('create returns the new record', async () => {
  const item = await myModel.create({ field: 'value' });
  expect(item.id).toBeDefined();
  expect(item.field).toBe('value');
});
```

### Integration tests

Add integration tests for every new API endpoint in `tests/integration/`.

```js
// tests/integration/myResource.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { resetDb } = require('../../../src/config/db');

beforeEach(() => resetDb());

test('POST /api/my-resource creates a record', async () => {
  const res = await request(app)
    .post('/api/my-resource')
    .set('Cookie', 'session=...')  // authenticated session
    .send({ field: 'value' });

  expect(res.status).toBe(201);
  expect(res.body.field).toBe('value');
});
```

Rules:
- Always call `resetDb()` in `beforeEach` to ensure test isolation (each test gets a fresh in-memory database).
- Test both success and error paths (missing fields, auth failure, not found).
- Do not test Pug rendering in integration tests — focus on JSON responses and redirect codes.

### Running tests

```bash
npm test             # all unit + integration tests
npm run test:watch   # watch mode during development
npm run test:e2e     # Playwright E2E (requires dev server on port 3000)
```

---

## Checklist Before Submitting

- [ ] New model functions have unit tests
- [ ] New API endpoints have integration tests
- [ ] `resetDb()` is called in `beforeEach` in every test file
- [ ] Validation rules added for any new POST/PUT body fields
- [ ] SQL uses `?` placeholders — no string interpolation of user data
- [ ] New IDs use `uuidv4()`
- [ ] INSERT is followed by SELECT to return the complete row
- [ ] Route errors are caught and return the correct response shape (HTML for pages, JSON for API)
- [ ] Tailwind classes use `_` separator, not `:`
