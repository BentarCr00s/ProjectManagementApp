'use strict';

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const { createTestUser, createTestWorkspace } = require('../helpers/fixtures');

describe('Workspace Routes', () => {
  let app;
  let cookie;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Fresh authenticated user for each test
    cookie = await createTestUser(app, {
      name: 'WS Tester',
      email: `ws-${Date.now()}@test.com`,
      password: 'password123'
    });
  });

  // -------------------------------------------------------------------------
  // POST /workspaces
  // -------------------------------------------------------------------------
  describe('POST /workspaces', () => {
    it('creates a workspace and redirects to /workspaces/:id', async () => {
      const res = await request(app)
        .post('/workspaces')
        .set('Cookie', cookie)
        .send({ name: 'My First Workspace' });

      expect(res.status).toBe(302);
      expect(res.headers['location']).toMatch(/^\/workspaces\/[^/]+$/);
    });

    it('requires authentication — redirects unauthenticated users to /login', async () => {
      const res = await request(app)
        .post('/workspaces')
        .send({ name: 'Unauthorized Workspace' });

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/login');
    });
  });

  // -------------------------------------------------------------------------
  // GET /workspaces/:id — redirect logic
  // -------------------------------------------------------------------------
  describe('GET /workspaces/:id', () => {
    it('redirects to first list when the workspace has at least one list', async () => {
      const ws = await createTestWorkspace(app, cookie, 'Redirect WS');

      // Create a list so the workspace is not empty
      await request(app)
        .post(`/workspaces/${ws.id}/lists`)
        .set('Cookie', cookie)
        .send({ name: 'Sprint 1' });

      const res = await request(app)
        .get(`/workspaces/${ws.id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(302);
      expect(res.headers['location']).toMatch(/\/lists\//);
    });

    it('renders the empty state when the workspace has no lists', async () => {
      const ws = await createTestWorkspace(app, cookie, 'Empty WS');

      const res = await request(app)
        .get(`/workspaces/${ws.id}`)
        .set('Cookie', cookie);

      // Either renders the page (200) or redirects internally — not to /login
      expect([200, 302]).toContain(res.status);
      if (res.status === 302) {
        expect(res.headers['location']).not.toBe('/login');
      }
    });

    it('returns 403 when a non-member tries to access the workspace', async () => {
      const ws = await createTestWorkspace(app, cookie, 'Private WS');

      // Register a different user
      const otherCookie = await createTestUser(app, {
        name: 'Outsider',
        email: `outsider-${Date.now()}@test.com`,
        password: 'pass'
      });

      const res = await request(app)
        .get(`/workspaces/${ws.id}`)
        .set('Cookie', otherCookie);

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // POST /workspaces/:id/lists
  // -------------------------------------------------------------------------
  describe('POST /workspaces/:id/lists', () => {
    it('creates a list and redirects to the list view', async () => {
      const ws = await createTestWorkspace(app, cookie, 'List WS');

      const res = await request(app)
        .post(`/workspaces/${ws.id}/lists`)
        .set('Cookie', cookie)
        .send({ name: 'New List' });

      expect(res.status).toBe(302);
      expect(res.headers['location']).toMatch(/\/workspaces\/[^/]+\/lists\/[^/]+/);
    });

    it('returns 403 when a non-member tries to create a list', async () => {
      const ws = await createTestWorkspace(app, cookie, 'Guarded WS');

      const otherCookie = await createTestUser(app, {
        name: 'Non Member',
        email: `nonmember-${Date.now()}@test.com`,
        password: 'pass'
      });

      const res = await request(app)
        .post(`/workspaces/${ws.id}/lists`)
        .set('Cookie', otherCookie)
        .send({ name: 'Sneaky List' });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // GET /dashboard
  // -------------------------------------------------------------------------
  describe('GET /dashboard', () => {
    it('returns 200 for authenticated users', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
    });

    it('redirects unauthenticated users to /login', async () => {
      const res = await request(app).get('/dashboard');
      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/login');
    });
  });
});
