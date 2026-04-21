'use strict';

/**
 * Creates an Express app instance wired to an in-memory SQLite database.
 *
 * Call this once per integration test file (or per test suite). The
 * setup.js globalSetup already runs beforeAll/afterEach hooks that
 * create the schema and clean tables, so all we need to do here is:
 *
 *   1. Force the in-memory URL before any module caches a real DB.
 *   2. Return the app so supertest can wrap it.
 *
 * Usage:
 *   const { createTestApp } = require('../helpers/testApp');
 *   const app = createTestApp();
 *   const request = require('supertest')(app);
 */
function createTestApp() {
  // Ensure the DB module will use in-memory SQLite.
  // setup.js sets this in beforeAll, but we guard here too so the
  // helper is safe to call from any context.
  process.env.TURSO_DATABASE_URL = ':memory:';

  // The app guards against double-listen with `require.main === module`,
  // so requiring it here is side-effect free (no port binding).
  const app = require('../../src/app');
  return app;
}

module.exports = { createTestApp };
