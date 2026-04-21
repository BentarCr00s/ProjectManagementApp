'use strict';
const userModel = require('../../../src/models/userModel');
const workspaceModel = require('../../../src/models/workspaceModel');
const listModel = require('../../../src/models/listModel');
const taskModel = require('../../../src/models/taskModel');
const commentModel = require('../../../src/models/commentModel');

describe('Comment Model', () => {
  let user, task;

  beforeEach(async () => {
    user = await userModel.create({
      name: 'Commenter',
      email: 'commenter@example.com',
      passwordHash: 'hash'
    });
    const workspace = await workspaceModel.create({ name: 'Test WS', ownerId: user.id });
    const list = await listModel.create({ name: 'Test List', workspaceId: workspace.id });
    task = await taskModel.create({ title: 'Test Task', listId: list.id, createdBy: user.id });
  });

  describe('create', () => {
    it('creates a comment and returns id, content, task_id, user_id, created_at', async () => {
      const comment = await commentModel.create({
        content: 'Hello, world!',
        taskId: task.id,
        userId: user.id
      });

      expect(comment).toBeDefined();
      expect(comment.id).toBeTruthy();
      expect(comment.content).toBe('Hello, world!');
      expect(comment.task_id).toBe(task.id);
      expect(comment.user_id).toBe(user.id);
      expect(comment.created_at).toBeTruthy();
    });
  });

  describe('findByTask', () => {
    it('returns comments for a task with user_name and avatar_color joined', async () => {
      await commentModel.create({ content: 'First comment', taskId: task.id, userId: user.id });
      await commentModel.create({ content: 'Second comment', taskId: task.id, userId: user.id });

      const comments = await commentModel.findByTask(task.id);
      expect(comments).toHaveLength(2);
      expect(comments[0]).toHaveProperty('user_name', user.name);
      expect(comments[0]).toHaveProperty('avatar_color');
      expect(comments[0]).toHaveProperty('content');
    });

    it('returns comments in ascending order by created_at', async () => {
      await commentModel.create({ content: 'Alpha', taskId: task.id, userId: user.id });
      await commentModel.create({ content: 'Beta', taskId: task.id, userId: user.id });

      const comments = await commentModel.findByTask(task.id);
      expect(comments[0].content).toBe('Alpha');
      expect(comments[1].content).toBe('Beta');
    });

    it('returns an empty array when task has no comments', async () => {
      const comments = await commentModel.findByTask(task.id);
      expect(comments).toEqual([]);
    });

    it('does not return comments from other tasks', async () => {
      const workspace = await workspaceModel.create({ name: 'WS2', ownerId: user.id });
      const list2 = await listModel.create({ name: 'List2', workspaceId: workspace.id });
      const task2 = await taskModel.create({ title: 'Other Task', listId: list2.id, createdBy: user.id });

      await commentModel.create({ content: 'Other task comment', taskId: task2.id, userId: user.id });
      await commentModel.create({ content: 'My task comment', taskId: task.id, userId: user.id });

      const comments = await commentModel.findByTask(task.id);
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('My task comment');
    });
  });

  describe('findById', () => {
    it('returns a comment by id', async () => {
      const created = await commentModel.create({
        content: 'Find me',
        taskId: task.id,
        userId: user.id
      });

      const found = await commentModel.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.content).toBe('Find me');
    });

    it('returns null/undefined for unknown id', async () => {
      const result = await commentModel.findById('fake-id');
      expect(result).toBeFalsy();
    });
  });

  describe('delete', () => {
    it('removes the comment from the database', async () => {
      const comment = await commentModel.create({
        content: 'Delete me',
        taskId: task.id,
        userId: user.id
      });

      await commentModel.delete(comment.id);
      const found = await commentModel.findById(comment.id);
      expect(found).toBeFalsy();
    });

    it('does not remove other comments', async () => {
      const c1 = await commentModel.create({ content: 'Keep', taskId: task.id, userId: user.id });
      const c2 = await commentModel.create({ content: 'Remove', taskId: task.id, userId: user.id });

      await commentModel.delete(c2.id);

      const comments = await commentModel.findByTask(task.id);
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe(c1.id);
    });
  });
});
