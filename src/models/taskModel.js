'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

const taskModel = {
  STATUSES,
  PRIORITIES,

  async findById(id) {
    const db = await getDb();
    return db.prepare(`
      SELECT t.*, 
             u.name  AS assignee_name, 
             u.avatar_color AS assignee_color,
             c.name  AS creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.id = ?
    `).get(id);
  },

  async findByList(listId) {
    const db = await getDb();
    return db.prepare(`
      SELECT t.*,
             u.name        AS assignee_name,
             u.avatar_color AS assignee_color
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.list_id = ?
      ORDER BY t.position ASC, t.created_at ASC
    `).all(listId);
  },

  async create({ title, description = '', status = 'TODO', priority = 'normal',
                 listId, assigneeId = null, dueDate = null,
                 timeEstimate = 0, createdBy, position = 0 }) {
    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO tasks
        (id, title, description, status, priority, list_id, assignee_id,
         due_date, time_estimate, created_by, position, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id, title, description, status, priority, listId, assigneeId,
           dueDate, timeEstimate, createdBy, position, now, now);
    return this.findById(id);
  },

  async update(id, fields) {
    const db = await getDb();
    const allowed = ['title','description','status','priority',
                     'assignee_id','due_date','time_estimate','position'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
    }
    if (!sets.length) return;
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString(), id);
    await db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  },

  async updateStatus(id, status) {
    const db = await getDb();
    await db.prepare(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?'
    ).run(status, new Date().toISOString(), id);
    return this.findById(id);
  },

  async updatePosition(id, position) {
    const db = await getDb();
    await db.prepare(
      'UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?'
    ).run(position, new Date().toISOString(), id);
  },

  async delete(id) {
    const db = await getDb();
    await db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },

  async addTimeTracked(id, seconds) {
    const db = await getDb();
    await db.prepare(
      'UPDATE tasks SET time_tracked = time_tracked + ?, updated_at = ? WHERE id = ?'
    ).run(seconds, new Date().toISOString(), id);
  },

  // Subtasks
  async getSubtasks(taskId) {
    const db = await getDb();
    return db.prepare(`
      SELECT s.*, u.name AS assignee_name, u.avatar_color AS assignee_color
      FROM subtasks s
      LEFT JOIN users u ON u.id = s.assignee_id
      WHERE s.task_id = ?
      ORDER BY s.position ASC
    `).all(taskId);
  },

  async createSubtask({ taskId, title, assigneeId = null, position = 0 }) {
    const db = await getDb();
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO subtasks (id, title, task_id, assignee_id, position) VALUES (?,?,?,?,?)'
    ).run(id, title, taskId, assigneeId, position);
    return { id, title, task_id: taskId, status: 'TODO', assignee_id: assigneeId };
  },

  async updateSubtask(id, { title, status }) {
    const db = await getDb();
    const sets = [];
    const vals = [];
    if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
    if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
    if (!sets.length) return;
    vals.push(id);
    await db.prepare(`UPDATE subtasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  },

  async deleteSubtask(id) {
    const db = await getDb();
    await db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },

  async findSubtaskById(id) {
    const db = await getDb();
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
  },

  async findByAssignee(userId) {
    const db = await getDb();
    return db.prepare(`
      SELECT tasks.*, lists.name AS list_name
      FROM tasks
      JOIN lists ON tasks.list_id = lists.id
      WHERE tasks.assignee_id = ?
      ORDER BY tasks.created_at DESC
    `).all(userId);
  },

  async findByDueDateRange(startDate, endDate) {
    const db = await getDb();
    return db.prepare(`
      SELECT * FROM tasks
      WHERE due_date BETWEEN ? AND ?
      ORDER BY due_date ASC
    `).all(startDate, endDate);
  },

  async search(query, workspaceId) {
    const db = await getDb();
    const like = `%${query}%`;
    return db.prepare(`
      SELECT tasks.*
      FROM tasks
      JOIN lists ON tasks.list_id = lists.id
      JOIN workspaces ON lists.workspace_id = workspaces.id
      WHERE workspaces.id = ?
        AND (tasks.title LIKE ? OR tasks.description LIKE ?)
      ORDER BY tasks.created_at DESC
    `).all(workspaceId, like, like);
  },
};

module.exports = taskModel;
