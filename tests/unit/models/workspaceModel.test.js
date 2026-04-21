'use strict';
const userModel = require('../../../src/models/userModel');
const workspaceModel = require('../../../src/models/workspaceModel');

describe('Workspace Model', () => {
  let owner;

  beforeEach(async () => {
    owner = await userModel.create({
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash: 'hash'
    });
  });

  describe('create', () => {
    it('creates a workspace and returns id, name, owner_id', async () => {
      const ws = await workspaceModel.create({ name: 'My Workspace', ownerId: owner.id });

      expect(ws).toBeDefined();
      expect(ws.id).toBeTruthy();
      expect(ws.name).toBe('My Workspace');
      expect(ws.owner_id).toBe(owner.id);
    });

    it('auto-adds the owner as a member with role "owner"', async () => {
      const ws = await workspaceModel.create({ name: 'Auto Member WS', ownerId: owner.id });
      const isMember = await workspaceModel.isMember(ws.id, owner.id);
      expect(isMember).toBe(true);

      const members = await workspaceModel.getMembers(ws.id);
      const ownerEntry = members.find(m => m.id === owner.id);
      expect(ownerEntry).toBeDefined();
      expect(ownerEntry.role).toBe('owner');
    });
  });

  describe('findById', () => {
    it('returns the workspace by id', async () => {
      const ws = await workspaceModel.create({ name: 'FindMe', ownerId: owner.id });
      const found = await workspaceModel.findById(ws.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(ws.id);
      expect(found.name).toBe('FindMe');
    });

    it('returns null/undefined for unknown id', async () => {
      const result = await workspaceModel.findById('fake-id');
      expect(result).toBeFalsy();
    });
  });

  describe('findByMember', () => {
    it('returns workspaces the user is a member of', async () => {
      const ws1 = await workspaceModel.create({ name: 'WS One', ownerId: owner.id });
      const ws2 = await workspaceModel.create({ name: 'WS Two', ownerId: owner.id });

      const results = await workspaceModel.findByMember(owner.id);
      const ids = results.map(w => w.id);
      expect(ids).toContain(ws1.id);
      expect(ids).toContain(ws2.id);
    });

    it('does not return workspaces the user has no membership in', async () => {
      const other = await userModel.create({ name: 'Other', email: 'other@example.com', passwordHash: 'h' });
      await workspaceModel.create({ name: 'Owners Only', ownerId: owner.id });

      const results = await workspaceModel.findByMember(other.id);
      expect(results).toHaveLength(0);
    });
  });

  describe('addMember', () => {
    it('adds a user as a member with the default role "member"', async () => {
      const ws = await workspaceModel.create({ name: 'AddMember WS', ownerId: owner.id });
      const newUser = await userModel.create({ name: 'Newbie', email: 'newbie@example.com', passwordHash: 'h' });

      await workspaceModel.addMember(ws.id, newUser.id);

      const isMember = await workspaceModel.isMember(ws.id, newUser.id);
      expect(isMember).toBe(true);

      const members = await workspaceModel.getMembers(ws.id);
      const entry = members.find(m => m.id === newUser.id);
      expect(entry.role).toBe('member');
    });

    it('does not throw when adding a member twice (INSERT OR IGNORE)', async () => {
      const ws = await workspaceModel.create({ name: 'Idempotent WS', ownerId: owner.id });
      await expect(workspaceModel.addMember(ws.id, owner.id)).resolves.not.toThrow();
    });
  });

  describe('getMembers', () => {
    it('returns an array with user info and role', async () => {
      const ws = await workspaceModel.create({ name: 'Members WS', ownerId: owner.id });
      const members = await workspaceModel.getMembers(ws.id);

      expect(Array.isArray(members)).toBe(true);
      expect(members).toHaveLength(1);
      expect(members[0]).toHaveProperty('id');
      expect(members[0]).toHaveProperty('name');
      expect(members[0]).toHaveProperty('email');
      expect(members[0]).toHaveProperty('avatar_color');
      expect(members[0]).toHaveProperty('role');
    });
  });

  describe('isMember', () => {
    it('returns true for a member', async () => {
      const ws = await workspaceModel.create({ name: 'Check WS', ownerId: owner.id });
      const result = await workspaceModel.isMember(ws.id, owner.id);
      expect(result).toBe(true);
    });

    it('returns false for a non-member', async () => {
      const ws = await workspaceModel.create({ name: 'Check WS', ownerId: owner.id });
      const stranger = await userModel.create({ name: 'Stranger', email: 'stranger@example.com', passwordHash: 'h' });

      const result = await workspaceModel.isMember(ws.id, stranger.id);
      expect(result).toBe(false);
    });
  });

  describe('getSpaces', () => {
    it('returns an empty array when workspace has no spaces', async () => {
      const ws = await workspaceModel.create({ name: 'No Spaces WS', ownerId: owner.id });
      const spaces = await workspaceModel.getSpaces(ws.id);
      expect(spaces).toEqual([]);
    });

    it('returns spaces associated with the workspace', async () => {
      const ws = await workspaceModel.create({ name: 'Spaces WS', ownerId: owner.id });
      await workspaceModel.createSpace({ name: 'Dev Space', workspaceId: ws.id });
      await workspaceModel.createSpace({ name: 'Design Space', workspaceId: ws.id });

      const spaces = await workspaceModel.getSpaces(ws.id);
      expect(spaces).toHaveLength(2);
      const names = spaces.map(s => s.name);
      expect(names).toContain('Dev Space');
      expect(names).toContain('Design Space');
    });
  });

  describe('createSpace', () => {
    it('creates a space and associates it with the workspace', async () => {
      const ws = await workspaceModel.create({ name: 'Space Parent', ownerId: owner.id });
      const space = await workspaceModel.createSpace({ name: 'Alpha', workspaceId: ws.id });

      expect(space).toBeDefined();
      expect(space.id).toBeTruthy();
      expect(space.name).toBe('Alpha');
      expect(space.workspace_id).toBe(ws.id);
    });

    it('uses default color and icon when not specified', async () => {
      const ws = await workspaceModel.create({ name: 'Defaults WS', ownerId: owner.id });
      const space = await workspaceModel.createSpace({ name: 'Beta', workspaceId: ws.id });

      expect(space.color).toBe('#4070ff');
      expect(space.icon).toBe('🚀');
    });

    it('accepts custom color and icon', async () => {
      const ws = await workspaceModel.create({ name: 'Custom WS', ownerId: owner.id });
      const space = await workspaceModel.createSpace({
        name: 'Gamma',
        workspaceId: ws.id,
        color: '#ff0000',
        icon: '🔥'
      });

      expect(space.color).toBe('#ff0000');
      expect(space.icon).toBe('🔥');
    });
  });
});
