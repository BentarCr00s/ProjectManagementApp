'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const tagModel = {
  async findByWorkspace(workspaceId) {
    const db = await getDb();
    return db.prepare(
      'SELECT * FROM tags WHERE workspace_id = ? ORDER BY name ASC'
    ).all(workspaceId);
  },

  async findById(id) {
    const db = await getDb();
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  },

  async create({ name, color = '#6b7280', workspaceId }) {
    const db = await getDb();
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO tags (id, name, color, workspace_id) VALUES (?, ?, ?, ?)'
    ).run(id, name, color, workspaceId);
    return { id, name, color, workspace_id: workspaceId };
  },

  async delete(id) {
    const db = await getDb();
    await db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },

  async addToTask(taskId, tagId) {
    const db = await getDb();
    await db.prepare(
      'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)'
    ).run(taskId, tagId);
  },

  async removeFromTask(taskId, tagId) {
    const db = await getDb();
    await db.prepare(
      'DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?'
    ).run(taskId, tagId);
  },

  async findByTask(taskId) {
    const db = await getDb();
    return db.prepare(`
      SELECT t.*
      FROM tags t
      JOIN task_tags tt ON tt.tag_id = t.id
      WHERE tt.task_id = ?
      ORDER BY t.name ASC
    `).all(taskId);
  },
};

module.exports = tagModel;
