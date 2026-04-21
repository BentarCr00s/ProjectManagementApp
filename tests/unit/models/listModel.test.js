'use strict';
const userModel = require('../../../src/models/userModel');
const workspaceModel = require('../../../src/models/workspaceModel');
const listModel = require('../../../src/models/listModel');

describe('List Model', () => {
  let workspace;

  beforeEach(async () => {
    const user = await userModel.create({
      name: 'Tester',
      email: 'tester@example.com',
      passwordHash: 'hash'
    });
    workspace = await workspaceModel.create({ name: 'Test WS', ownerId: user.id });
  });

  describe('create', () => {
    it('creates a list and returns id, name, workspace_id', async () => {
      const list = await listModel.create({ name: 'Sprint 1', workspaceId: workspace.id });

      expect(list).toBeDefined();
      expect(list.id).toBeTruthy();
      expect(list.name).toBe('Sprint 1');
      expect(list.workspace_id).toBe(workspace.id);
    });

    it('creates a list with null space_id by default', async () => {
      const list = await listModel.create({ name: 'No Space List', workspaceId: workspace.id });
      expect(list.space_id).toBeNull();
    });

    it('creates a list associated with a space when spaceId is provided', async () => {
      const space = await workspaceModel.createSpace({ name: 'Dev Space', workspaceId: workspace.id });
      const list = await listModel.create({
        name: 'Space List',
        workspaceId: workspace.id,
        spaceId: space.id
      });

      expect(list.space_id).toBe(space.id);
    });
  });

  describe('findById', () => {
    it('returns the list by id', async () => {
      const list = await listModel.create({ name: 'Find Me', workspaceId: workspace.id });
      const found = await listModel.findById(list.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(list.id);
      expect(found.name).toBe('Find Me');
    });

    it('returns null/undefined for unknown id', async () => {
      const result = await listModel.findById('non-existent-id');
      expect(result).toBeFalsy();
    });
  });

  describe('findByWorkspace', () => {
    it('returns all lists for a workspace', async () => {
      await listModel.create({ name: 'List A', workspaceId: workspace.id });
      await listModel.create({ name: 'List B', workspaceId: workspace.id });
      await listModel.create({ name: 'List C', workspaceId: workspace.id });

      const lists = await listModel.findByWorkspace(workspace.id);
      expect(lists).toHaveLength(3);
      const names = lists.map(l => l.name);
      expect(names).toContain('List A');
      expect(names).toContain('List B');
      expect(names).toContain('List C');
    });

    it('returns an empty array when workspace has no lists', async () => {
      const lists = await listModel.findByWorkspace(workspace.id);
      expect(lists).toEqual([]);
    });

    it('does not return lists from other workspaces', async () => {
      const user2 = await userModel.create({ name: 'Other', email: 'other@example.com', passwordHash: 'h' });
      const ws2 = await workspaceModel.create({ name: 'Other WS', ownerId: user2.id });
      await listModel.create({ name: 'Other List', workspaceId: ws2.id });

      await listModel.create({ name: 'My List', workspaceId: workspace.id });

      const lists = await listModel.findByWorkspace(workspace.id);
      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe('My List');
    });
  });

  describe('update', () => {
    it('changes the name of a list', async () => {
      const list = await listModel.create({ name: 'Old Name', workspaceId: workspace.id });
      await listModel.update(list.id, { name: 'New Name' });

      const updated = await listModel.findById(list.id);
      expect(updated.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('removes the list from the database', async () => {
      const list = await listModel.create({ name: 'Delete Me', workspaceId: workspace.id });
      await listModel.delete(list.id);

      const found = await listModel.findById(list.id);
      expect(found).toBeFalsy();
    });

    it('does not affect other lists', async () => {
      const list1 = await listModel.create({ name: 'Keep Me', workspaceId: workspace.id });
      const list2 = await listModel.create({ name: 'Remove Me', workspaceId: workspace.id });

      await listModel.delete(list2.id);

      const remaining = await listModel.findByWorkspace(workspace.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(list1.id);
    });
  });
});
