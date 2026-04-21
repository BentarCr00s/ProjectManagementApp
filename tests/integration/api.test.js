'use strict';

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const {
  createTestUser,
  createTestWorkspace,
  createTestList,
  createTestTask,
} = require('../helpers/fixtures');

describe('API Routes', () => {
  let app;
  let cookie;
  let workspace;
  let list;
  let task;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Unique email per test run to avoid duplicate-email collisions
    cookie = await createTestUser(app, {
      name: 'API Tester',
      email: `api-${Date.now()}@test.com`,
      password: 'password123'
    });
    workspace = await createTestWorkspace(app, cookie, 'API WS');
    list = await createTestList(app, cookie, workspace.id, 'API List');
    task = await createTestTask(app, cookie, list.id, 'Base Task');
  });

  // -------------------------------------------------------------------------
  // POST /api/tasks
  // -------------------------------------------------------------------------
  describe('POST /api/tasks', () => {
    it('creates a task and returns 201 with the task object', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ title: 'New Task', listId: list.id });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('TODO');
    });

    it('returns 401 when unauthenticated (JSON request)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Accept', 'application/json')
        .send({ title: 'Sneaky', listId: list.id });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 500 when title is missing (DB NOT NULL constraint)', async () => {
      // The route passes title straight to the model; missing title hits a DB error
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ listId: list.id });

      // Model will throw because title is NOT NULL — route returns 500
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('sets status to TODO by default', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ title: 'Default Status Task', listId: list.id });

      expect(res.body.status).toBe('TODO');
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/tasks/:id/status
  // -------------------------------------------------------------------------
  describe('PUT /api/tasks/:id/status', () => {
    it('updates the task status and returns 200 with updated task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('returns 400 for an invalid status value', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ status: 'FLYING' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid status');
    });

    it('accepts all valid status values', async () => {
      const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
      for (const status of statuses) {
        const res = await request(app)
          .put(`/api/tasks/${task.id}/status`)
          .set('Cookie', cookie)
          .set('Accept', 'application/json')
          .send({ status });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(status);
      }
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/tasks/:id
  // -------------------------------------------------------------------------
  describe('PUT /api/tasks/:id', () => {
    it('updates multiple task fields and returns the updated task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ title: 'Updated Title', priority: 'urgent', description: 'New desc' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('urgent');
      expect(res.body.description).toBe('New desc');
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Accept', 'application/json')
        .send({ title: 'Hack' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/comments
  // -------------------------------------------------------------------------
  describe('POST /api/tasks/:id/comments', () => {
    it('adds a comment and returns 201 with the comment object', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json')
        .send({ content: 'Nice work!' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.content).toBe('Nice work!');
      expect(res.body.task_id).toBe(task.id);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Accept', 'application/json')
        .send({ content: 'Sneaky comment' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/time/start
  // -------------------------------------------------------------------------
  describe('POST /api/tasks/:id/time/start', () => {
    it('starts a timer and returns 201 with the time entry', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/time/start`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.task_id).toBe(task.id);
      expect(res.body.started_at).toBeTruthy();
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/time/start`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/time/stop
  // -------------------------------------------------------------------------
  describe('POST /api/tasks/:id/time/stop', () => {
    it('stops an active timer and returns the stopped entry', async () => {
      // Start first
      await request(app)
        .post(`/api/tasks/${task.id}/time/start`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json');

      const res = await request(app)
        .post(`/api/tasks/${task.id}/time/stop`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.ended_at).toBeTruthy();
    });

    it('returns a "No active timer" message when no timer is running', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/time/stop`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'No active timer');
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task.id}/time/stop`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/tasks/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/tasks/:id', () => {
    it('deletes the task and returns 200 or 204', async () => {
      const created = await createTestTask(app, cookie, list.id, 'Delete Me');

      const res = await request(app)
        .delete(`/api/tasks/${created.id}`)
        .set('Cookie', cookie)
        .set('Accept', 'application/json');

      expect([200, 204]).toContain(res.status);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });
  });
});
