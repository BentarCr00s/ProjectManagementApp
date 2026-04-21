'use strict';

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  // -------------------------------------------------------------------------
  // POST /register
  // -------------------------------------------------------------------------
  describe('POST /register', () => {
    it('registers a new user and redirects to /dashboard', async () => {
      const res = await request(app)
        .post('/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/dashboard');
      // A session cookie must be set
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 400 when the email is already in use', async () => {
      await request(app)
        .post('/register')
        .send({ name: 'Bob', email: 'duplicate@test.com', password: 'password123' });

      const res = await request(app)
        .post('/register')
        .send({ name: 'Bob Again', email: 'duplicate@test.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/email already in use/i);
    });
  });

  // -------------------------------------------------------------------------
  // POST /login
  // -------------------------------------------------------------------------
  describe('POST /login', () => {
    beforeEach(async () => {
      // Register a user to login with
      await request(app)
        .post('/register')
        .send({ name: 'Login User', email: 'login@test.com', password: 'correct_pass' });
    });

    it('logs in with correct credentials and redirects to /dashboard', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'login@test.com', password: 'correct_pass' });

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/dashboard');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 401 with wrong password', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'login@test.com', password: 'wrong_pass' });

      expect(res.status).toBe(401);
      expect(res.text).toMatch(/invalid email or password/i);
    });

    it('returns 401 for an email that does not exist', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'nobody@test.com', password: 'anything' });

      expect(res.status).toBe(401);
      expect(res.text).toMatch(/invalid email or password/i);
    });
  });

  // -------------------------------------------------------------------------
  // GET /logout
  // -------------------------------------------------------------------------
  describe('GET /logout', () => {
    it('destroys the session and redirects to /login', async () => {
      // First register to get a session
      const regRes = await request(app)
        .post('/register')
        .send({ name: 'Logout User', email: 'logout@test.com', password: 'password123' });

      const cookie = regRes.headers['set-cookie'];

      const res = await request(app)
        .get('/logout')
        .set('Cookie', cookie);

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/login');
    });
  });

  // -------------------------------------------------------------------------
  // requireAuth middleware
  // -------------------------------------------------------------------------
  describe('requireAuth middleware', () => {
    it('redirects unauthenticated browser requests to /login', async () => {
      const res = await request(app)
        .get('/dashboard');

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/login');
    });

    it('returns 401 JSON for unauthenticated API requests (Accept: application/json)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Accept', 'application/json')
        .send({ title: 'Secret', listId: 'x' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('allows authenticated requests through to protected routes', async () => {
      const regRes = await request(app)
        .post('/register')
        .send({ name: 'Auth Test', email: 'authtest@test.com', password: 'password123' });

      const cookie = regRes.headers['set-cookie'];

      const res = await request(app)
        .get('/dashboard')
        .set('Cookie', cookie);

      // Should NOT redirect to login — the route either renders (200) or
      // redirects internally for other reasons, but not to /login
      if (res.status === 302) {
        expect(res.headers['location']).not.toBe('/login');
      } else {
        expect(res.status).toBe(200);
      }
    });
  });
});
