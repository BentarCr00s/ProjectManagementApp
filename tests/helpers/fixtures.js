'use strict';

const request = require('supertest');

/**
 * Registers a user via POST /register and returns the session cookie.
 *
 * @param {import('express').Application} app
 * @param {{ name?: string, email?: string, password?: string }} opts
 * @returns {Promise<string>} session cookie string
 */
async function createTestUser(app, {
  name = 'Test User',
  email = `test-${Date.now()}@example.com`,
  password = 'password123'
} = {}) {
  const res = await request(app)
    .post('/register')
    .send({ name, email, password });

  // Expect a redirect to /dashboard on success
  if (res.status !== 302 && res.status !== 200) {
    throw new Error(`createTestUser: register failed with status ${res.status}`);
  }

  const cookie = res.headers['set-cookie'];
  if (!cookie) {
    throw new Error('createTestUser: no session cookie returned from /register');
  }

  // Return the raw Set-Cookie header value (array or string)
  return Array.isArray(cookie) ? cookie.join('; ') : cookie;
}

/**
 * Creates a workspace via POST /workspaces.
 * Follows the redirect to extract the workspace id.
 *
 * @param {import('express').Application} app
 * @param {string} cookie  session cookie from createTestUser
 * @param {string} name    workspace name
 * @returns {Promise<{ id: string, name: string }>}
 */
async function createTestWorkspace(app, cookie, name = 'Test Workspace') {
  const res = await request(app)
    .post('/workspaces')
    .set('Cookie', cookie)
    .send({ name });

  if (res.status !== 302) {
    throw new Error(`createTestWorkspace: expected redirect, got ${res.status}`);
  }

  // Location: /workspaces/:id
  const location = res.headers['location'];
  const match = location && location.match(/\/workspaces\/([^/]+)/);
  if (!match) {
    throw new Error(`createTestWorkspace: could not parse workspace id from location: ${location}`);
  }

  return { id: match[1], name };
}

/**
 * Creates a list inside a workspace via POST /workspaces/:id/lists.
 *
 * @param {import('express').Application} app
 * @param {string} cookie       session cookie
 * @param {string} workspaceId
 * @param {string} name         list name
 * @returns {Promise<{ id: string, name: string, workspaceId: string }>}
 */
async function createTestList(app, cookie, workspaceId, name = 'Test List') {
  const res = await request(app)
    .post(`/workspaces/${workspaceId}/lists`)
    .set('Cookie', cookie)
    .send({ name });

  if (res.status !== 302) {
    throw new Error(`createTestList: expected redirect, got ${res.status}`);
  }

  // Location: /workspaces/:id/lists/:listId
  const location = res.headers['location'];
  const match = location && location.match(/\/lists\/([^/]+)/);
  if (!match) {
    throw new Error(`createTestList: could not parse list id from location: ${location}`);
  }

  return { id: match[1], name, workspaceId };
}

/**
 * Creates a task via POST /api/tasks.
 *
 * @param {import('express').Application} app
 * @param {string} cookie   session cookie
 * @param {string} listId
 * @param {string} title
 * @returns {Promise<object>} created task object
 */
async function createTestTask(app, cookie, listId, title = 'Test Task') {
  const res = await request(app)
    .post('/api/tasks')
    .set('Cookie', cookie)
    .set('Accept', 'application/json')
    .send({ title, listId });

  if (res.status !== 201) {
    throw new Error(`createTestTask: expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  }

  return res.body;
}

module.exports = {
  createTestUser,
  createTestWorkspace,
  createTestList,
  createTestTask,
};
