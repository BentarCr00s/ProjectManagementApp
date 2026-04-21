'use strict';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

const AVATAR_COLORS = [
  '#4070ff','#a855f7','#22c55e','#f97316',
  '#ef4444','#06b6d4','#eab308','#ec4899',
];

const userModel = {
  async findByEmail(email) {
    const db = await getDb();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  async findById(id) {
    const db = await getDb();
    return db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(id);
  },

  async create({ name, email, passwordHash }) {
    const db = await getDb();
    const id = uuidv4();
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    await db.prepare(
      'INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, email, passwordHash, color);
    return { id, name, email, avatar_color: color };
  },

  async findManyByIds(ids) {
    if (!ids.length) return [];
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    return db.prepare(
      `SELECT id, name, email, avatar_color FROM users WHERE id IN (${placeholders})`
    ).all(...ids);
  },

  async update(id, { name, avatar_color }) {
    const db = await getDb();
    const sets = [];
    const vals = [];
    if (name !== undefined)         { sets.push('name = ?');         vals.push(name); }
    if (avatar_color !== undefined) { sets.push('avatar_color = ?'); vals.push(avatar_color); }
    if (!sets.length) return this.findById(id);
    vals.push(id);
    await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  },

  async updatePassword(id, newHash) {
    const db = await getDb();
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, id);
  },
};

module.exports = userModel;
