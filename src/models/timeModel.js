'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const timeModel = {
  /** Start a new time entry (only one active per task/user at a time) */
  async startEntry({ taskId, userId }) {
    const db = await getDb();
    // Stop any existing open entry first
    await this.stopActiveEntry(taskId, userId);
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO time_entries (id, task_id, user_id, started_at) VALUES (?,?,?,?)'
    ).run(id, taskId, userId, now);
    return { id, task_id: taskId, user_id: userId, started_at: now };
  },

  /** Stop the active time entry and update task.time_tracked */
  async stopActiveEntry(taskId, userId) {
    const db = await getDb();
    const entry = await db.prepare(`
      SELECT * FROM time_entries
      WHERE task_id = ? AND user_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `).get(taskId, userId);
    if (!entry) return null;

    const now = new Date();
    const started = new Date(entry.started_at);
    const duration = Math.floor((now - started) / 1000);
    await db.prepare(
      'UPDATE time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?'
    ).run(now.toISOString(), duration, entry.id);

    // Update cumulative time on task
    await db.prepare(
      'UPDATE tasks SET time_tracked = time_tracked + ?, updated_at = ? WHERE id = ?'
    ).run(duration, now.toISOString(), taskId);

    return { ...entry, ended_at: now.toISOString(), duration_seconds: duration };
  },

  async getActiveEntry(taskId, userId) {
    const db = await getDb();
    return db.prepare(`
      SELECT * FROM time_entries
      WHERE task_id = ? AND user_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `).get(taskId, userId);
  },

  async getByTask(taskId) {
    const db = await getDb();
    return db.prepare(`
      SELECT te.*, u.name AS user_name, u.avatar_color
      FROM time_entries te
      INNER JOIN users u ON u.id = te.user_id
      WHERE te.task_id = ?
      ORDER BY te.started_at DESC
    `).all(taskId);
  },
};

module.exports = timeModel;
