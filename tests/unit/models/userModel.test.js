'use strict';
const userModel = require('../../../src/models/userModel');

describe('User Model', () => {
  describe('create', () => {
    it('creates a user and returns id, name, email, avatar_color', async () => {
      const user = await userModel.create({
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash: 'hashed_pw'
      });

      expect(user).toBeDefined();
      expect(user.id).toBeTruthy();
      expect(user.name).toBe('Alice');
      expect(user.email).toBe('alice@example.com');
      expect(user.avatar_color).toBeTruthy();
    });

    it('auto-assigns an avatar_color from the predefined palette', async () => {
      const user = await userModel.create({
        name: 'Bob',
        email: 'bob@example.com',
        passwordHash: 'hashed_pw'
      });

      const validColors = [
        '#4070ff', '#a855f7', '#22c55e', '#f97316',
        '#ef4444', '#06b6d4', '#eab308', '#ec4899',
      ];
      expect(validColors).toContain(user.avatar_color);
    });

    it('does not return password_hash in the result', async () => {
      const user = await userModel.create({
        name: 'Carol',
        email: 'carol@example.com',
        passwordHash: 'super_secret'
      });

      expect(user.password_hash).toBeUndefined();
    });
  });

  describe('findByEmail', () => {
    it('returns the user (with password_hash) when found', async () => {
      await userModel.create({
        name: 'Dave',
        email: 'dave@example.com',
        passwordHash: 'hash123'
      });

      const found = await userModel.findByEmail('dave@example.com');
      expect(found).toBeDefined();
      expect(found.email).toBe('dave@example.com');
      expect(found.password_hash).toBe('hash123');
    });

    it('returns null/undefined for a missing email', async () => {
      const result = await userModel.findByEmail('nobody@example.com');
      expect(result).toBeFalsy();
    });
  });

  describe('findById', () => {
    it('returns the user without password_hash', async () => {
      const created = await userModel.create({
        name: 'Eve',
        email: 'eve@example.com',
        passwordHash: 'secret'
      });

      const found = await userModel.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Eve');
      expect(found.email).toBe('eve@example.com');
      expect(found.password_hash).toBeUndefined();
    });

    it('returns null/undefined for an unknown id', async () => {
      const result = await userModel.findById('non-existent-uuid');
      expect(result).toBeFalsy();
    });
  });

  describe('findManyByIds', () => {
    it('returns the correct subset of users', async () => {
      const u1 = await userModel.create({ name: 'Frank', email: 'frank@example.com', passwordHash: 'h' });
      const u2 = await userModel.create({ name: 'Grace', email: 'grace@example.com', passwordHash: 'h' });
      await userModel.create({ name: 'Heidi', email: 'heidi@example.com', passwordHash: 'h' });

      const results = await userModel.findManyByIds([u1.id, u2.id]);
      expect(results).toHaveLength(2);
      const emails = results.map(u => u.email);
      expect(emails).toContain('frank@example.com');
      expect(emails).toContain('grace@example.com');
      expect(emails).not.toContain('heidi@example.com');
    });

    it('returns an empty array when given an empty ids array', async () => {
      const results = await userModel.findManyByIds([]);
      expect(results).toEqual([]);
    });

    it('excludes password_hash from returned users', async () => {
      const u = await userModel.create({ name: 'Ivan', email: 'ivan@example.com', passwordHash: 'secret' });
      const results = await userModel.findManyByIds([u.id]);
      expect(results[0].password_hash).toBeUndefined();
    });
  });
});
