'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const workspaceModel = {
  async findById(id) {
    const db = await getDb();
    return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  },

  async findByOwner(ownerId) {
    const db = await getDb();
    return db.prepare('SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at ASC').all(ownerId);
  },

  async findByMember(userId) {
    const db = await getDb();
    return db.prepare(`
      SELECT w.* FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
      ORDER BY w.created_at ASC
    `).all(userId);
  },

  async create({ name, ownerId }) {
    const db = await getDb();
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)'
    ).run(id, name, ownerId);
    // Auto-add owner as member
    await db.prepare(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
    ).run(id, ownerId, 'owner');
    return { id, name, owner_id: ownerId };
  },

  async addMember(workspaceId, userId, role = 'member') {
    const db = await getDb();
    const existing = await db.prepare(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(workspaceId, userId);
    if (!existing) {
      await db.prepare(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
      ).run(workspaceId, userId, role);
    }
  },

  async getMembers(workspaceId) {
    const db = await getDb();
    return db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_color, wm.role
      FROM users u
      INNER JOIN workspace_members wm ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
    `).all(workspaceId);
  },

  async isMember(workspaceId, userId) {
    const db = await getDb();
    const row = await db.prepare(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(workspaceId, userId);
    return !!row;
  },

  async getSpaces(workspaceId) {
    const db = await getDb();
    return db.prepare('SELECT * FROM spaces WHERE workspace_id = ? ORDER BY created_at ASC').all(workspaceId);
  },

  async createSpace({ name, workspaceId, color = '#4070ff', icon = '🚀' }) {
    const db = await getDb();
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO spaces (id, name, workspace_id, color, icon) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, workspaceId, color, icon);
    return { id, name, workspace_id: workspaceId, color, icon };
  },

  async update(id, { name }) {
    const db = await getDb();
    await db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(name, id);
    return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  },

  async delete(id) {
    const db = await getDb();
    await db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  },

  async removeMember(workspaceId, userId) {
    const db = await getDb();
    await db.prepare(
      'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).run(workspaceId, userId);
  },

  async updateMemberRole(workspaceId, userId, role) {
    const db = await getDb();
    await db.prepare(
      'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
    ).run(role, workspaceId, userId);
  },

  async getMemberRole(workspaceId, userId) {
    const db = await getDb();
    const row = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(workspaceId, userId);
    return row ? row.role : null;
  },
};

module.exports = workspaceModel;
