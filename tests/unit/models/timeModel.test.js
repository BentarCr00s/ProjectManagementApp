'use strict';
const userModel = require('../../../src/models/userModel');
const workspaceModel = require('../../../src/models/workspaceModel');
const listModel = require('../../../src/models/listModel');
const taskModel = require('../../../src/models/taskModel');
const timeModel = require('../../../src/models/timeModel');

describe('Time Model', () => {
  let user, task;

  beforeEach(async () => {
    user = await userModel.create({
      name: 'Timer User',
      email: 'timer@example.com',
      passwordHash: 'hash'
    });
    const workspace = await workspaceModel.create({ name: 'Timer WS', ownerId: user.id });
    const list = await listModel.create({ name: 'Timer List', workspaceId: workspace.id });
    task = await taskModel.create({ title: 'Timer Task', listId: list.id, createdBy: user.id });
  });

  describe('startEntry', () => {
    it('creates a new time entry with started_at and no ended_at', async () => {
      const entry = await timeModel.startEntry({ taskId: task.id, userId: user.id });

      expect(entry).toBeDefined();
      expect(entry.id).toBeTruthy();
      expect(entry.task_id).toBe(task.id);
      expect(entry.user_id).toBe(user.id);
      expect(entry.started_at).toBeTruthy();
    });

    it('stops any existing active entry before creating a new one', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      // Start again — should stop the first entry automatically
      const second = await timeModel.startEntry({ taskId: task.id, userId: user.id });

      // Only the second entry should be active
      const active = await timeModel.getActiveEntry(task.id, user.id);
      expect(active.id).toBe(second.id);

      const allEntries = await timeModel.getByTask(task.id);
      expect(allEntries).toHaveLength(2);
    });
  });

  describe('getActiveEntry', () => {
    it('returns the active entry when a timer is running', async () => {
      const entry = await timeModel.startEntry({ taskId: task.id, userId: user.id });
      const active = await timeModel.getActiveEntry(task.id, user.id);

      expect(active).toBeDefined();
      expect(active.id).toBe(entry.id);
      expect(active.ended_at).toBeNull();
    });

    it('returns null when no timer is running', async () => {
      const active = await timeModel.getActiveEntry(task.id, user.id);
      expect(active).toBeFalsy();
    });

    it('returns null after the active entry has been stopped', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      await timeModel.stopActiveEntry(task.id, user.id);

      const active = await timeModel.getActiveEntry(task.id, user.id);
      expect(active).toBeFalsy();
    });
  });

  describe('stopActiveEntry', () => {
    it('sets ended_at and duration_seconds on the active entry', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      const stopped = await timeModel.stopActiveEntry(task.id, user.id);

      expect(stopped).toBeDefined();
      expect(stopped.ended_at).toBeTruthy();
      expect(typeof stopped.duration_seconds).toBe('number');
      expect(stopped.duration_seconds).toBeGreaterThanOrEqual(0);
    });

    it('returns null when there is no active entry to stop', async () => {
      const result = await timeModel.stopActiveEntry(task.id, user.id);
      expect(result).toBeNull();
    });

    it('updates the task time_tracked with the elapsed seconds', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      const stopped = await timeModel.stopActiveEntry(task.id, user.id);

      const updatedTask = await taskModel.findById(task.id);
      expect(updatedTask.time_tracked).toBeGreaterThanOrEqual(stopped.duration_seconds);
    });
  });

  describe('getByTask', () => {
    it('returns all time entries for a task', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      await timeModel.stopActiveEntry(task.id, user.id);
      await timeModel.startEntry({ taskId: task.id, userId: user.id });

      const entries = await timeModel.getByTask(task.id);
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('returns entries with user_name and avatar_color joined', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });

      const entries = await timeModel.getByTask(task.id);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveProperty('user_name', user.name);
      expect(entries[0]).toHaveProperty('avatar_color');
    });

    it('returns an empty array when no entries exist for the task', async () => {
      const entries = await timeModel.getByTask(task.id);
      expect(entries).toEqual([]);
    });

    it('returns entries ordered by started_at descending', async () => {
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      await timeModel.stopActiveEntry(task.id, user.id);
      await timeModel.startEntry({ taskId: task.id, userId: user.id });
      await timeModel.stopActiveEntry(task.id, user.id);

      const entries = await timeModel.getByTask(task.id);
      expect(entries).toHaveLength(2);
      // Most recent first
      const first = new Date(entries[0].started_at);
      const second = new Date(entries[1].started_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    });
  });
});
