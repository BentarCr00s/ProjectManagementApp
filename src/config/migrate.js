'use strict';
require('dotenv').config();

async function migrate() {
  const { connect } = await import('@tursodatabase/database');
  const url = process.env.TURSO_DATABASE_URL || 'local.db';
  const db = await connect(url);

  console.log(`🗄️  Running migrations on: ${url}`);

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
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (workspace_id, user_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      color        TEXT NOT NULL DEFAULT '#4070ff',
      icon         TEXT NOT NULL DEFAULT '🚀',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lists (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      space_id     TEXT,
      workspace_id TEXT NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL
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
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id)     REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'TODO',
      task_id     TEXT NOT NULL,
      assignee_id TEXT,
      position    INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id)     REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         TEXT PRIMARY KEY,
      content    TEXT NOT NULL,
      task_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id)  REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id               TEXT PRIMARY KEY,
      task_id          TEXT NOT NULL,
      user_id          TEXT NOT NULL,
      started_at       DATETIME NOT NULL,
      ended_at         DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (task_id)  REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      color        TEXT NOT NULL DEFAULT '#6b7280',
      workspace_id TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id  TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)  REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_list_id                ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee               ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status                 ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task_id             ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_comments_task_id             ON comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_lists_workspace              ON lists(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_users_email                  ON users(email);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user       ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace  ON workspace_members(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_task            ON time_entries(task_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_user            ON time_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id            ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date               ON tasks(due_date);
  `);

  console.log('✅ Migrations completed successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
