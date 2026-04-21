const { getDb } = require('../../src/config/db');

// Reset DB before all tests
beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = ':memory:'; // Force in-memory for testing
  const db = await getDb();
  
  // Create minimal schema for tests
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#4070ff',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      owner_id    TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      color        TEXT NOT NULL DEFAULT '#4070ff',
      icon         TEXT NOT NULL DEFAULT '🚀',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lists (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      space_id     TEXT,
      workspace_id TEXT NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      description    TEXT,
      status         TEXT NOT NULL DEFAULT 'TODO',
      priority       TEXT NOT NULL DEFAULT 'normal',
      list_id        TEXT NOT NULL,
      assignee_id    TEXT,
      due_date       TEXT,
      time_estimate  INTEGER DEFAULT 0,
      time_tracked   INTEGER DEFAULT 0,
      created_by     TEXT NOT NULL,
      position       INTEGER DEFAULT 0,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS subtasks (
      id          TEXT PRIMARY KEY, title TEXT, status TEXT, task_id TEXT, assignee_id TEXT, position INTEGER, created_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, content TEXT, task_id TEXT, user_id TEXT, created_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY, task_id TEXT, user_id TEXT, started_at DATETIME, ended_at DATETIME, duration_seconds INTEGER
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#4070ff', workspace_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY (task_id, tag_id)
    );
  `);
});

afterEach(async () => {
  const db = await getDb();
  // Clean tables
  await db.exec('DELETE FROM task_tags; DELETE FROM time_entries; DELETE FROM comments; DELETE FROM subtasks; DELETE FROM tasks; DELETE FROM lists; DELETE FROM spaces; DELETE FROM workspace_members; DELETE FROM workspaces; DELETE FROM users;');
});

afterAll(async () => {
  // DB closure is handled if needed
});
