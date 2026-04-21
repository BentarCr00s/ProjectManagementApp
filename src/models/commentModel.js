'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const commentModel = {
  async findByTask(taskId) {
    const db = await getDb();
    return db.prepare(`
      SELECT c.*, u.name AS user_name, u.avatar_color
      FROM comments c
      INNER JOIN users u ON u.id = c.user_id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(taskId);
  },

  async create({ content, taskId, userId }) {
    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO comments (id, content, task_id, user_id, created_at) VALUES (?,?,?,?,?)'
    ).run(id, content, taskId, userId, now);
    return { id, content, task_id: taskId, user_id: userId, created_at: now };
  },

  async delete(id) {
    const db = await getDb();
    await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  },

  async findById(id) {
    const db = await getDb();
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  },

  async update(id, { content }) {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.prepare(
      'UPDATE comments SET content = ?, updated_at = ? WHERE id = ?'
    ).run(content, now, id);
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  },
};

module.exports = commentModel;
