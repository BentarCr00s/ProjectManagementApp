'use strict';
const path = require('path');
require('dotenv').config();

let db;

/**
 * Get (or lazily initialize) the DB connection.
 * Supports:
 *   - ':memory:'        → in-memory (tests)
 *   - 'my-database.db' → file-based (local dev)
 *   - Turso Cloud URL   → set TURSO_DATABASE_URL
 */
async function getDb() {
  if (!db) {
    const { connect } = await import('@tursodatabase/database');
    const url = process.env.TURSO_DATABASE_URL || 'local.db';
    db = await connect(url);
  }
  return db;
}

/** For tests: reset the cached instance */
function resetDb() {
  db = null;
}

module.exports = { getDb, resetDb };
