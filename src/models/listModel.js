'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const listModel = {
  async findById(id) {
    const db = await getDb();
    return db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
  },

  async findByWorkspace(workspaceId) {
    const db = await getDb();
    return db.prepare(
      'SELECT * FROM lists WHERE workspace_id = ? ORDER BY created_at ASC'
    ).all(workspaceId);
  },

  async create({ name, workspaceId, spaceId = null }) {
    const db = await getDb();
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO lists (id, name, workspace_id, space_id) VALUES (?, ?, ?, ?)'
    ).run(id, name, workspaceId, spaceId);
    return { id, name, workspace_id: workspaceId, space_id: spaceId };
  },

  async delete(id) {
    const db = await getDb();
    await db.prepare('DELETE FROM lists WHERE id = ?').run(id);
  },

  async update(id, { name }) {
    const db = await getDb();
    await db.prepare('UPDATE lists SET name = ? WHERE id = ?').run(name, id);
  },
};

module.exports = listModel;
