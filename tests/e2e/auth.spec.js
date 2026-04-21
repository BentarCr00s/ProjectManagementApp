'use strict';

const { test, expect } = require('@playwright/test');

// Helper: generate a unique email for each test run
function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.test`;
}

// ---------------------------------------------------------------------------
// Navigate to / redirects to /login when not authenticated
// ---------------------------------------------------------------------------
test('unauthenticated visit to /login stays on /login', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL('/login');
});

test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

// ---------------------------------------------------------------------------
// Register new user → lands on /dashboard
// ---------------------------------------------------------------------------
test('register a new user and land on /dashboard', async ({ page }) => {
  const email = uniqueEmail('reg');

  await page.goto('/register');
  await page.fill('input[name="name"]', 'Auth E2E User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});

// ---------------------------------------------------------------------------
// Logout → redirects to /login
// ---------------------------------------------------------------------------
test('logout clears session and redirects to /login', async ({ page }) => {
  const email = uniqueEmail('logout');

  // First register to get a session
  await page.goto('/register');
  await page.fill('input[name="name"]', 'Logout User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // Click the logout link/button
  await page.click('a[href="/logout"]');

  await expect(page).toHaveURL('/login');
});

test('after logout, visiting /dashboard redirects back to /login', async ({ page }) => {
  const email = uniqueEmail('afterlogout');

  await page.goto('/register');
  await page.fill('input[name="name"]', 'Post Logout User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  await page.click('a[href="/logout"]');
  await expect(page).toHaveURL('/login');

  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

// ---------------------------------------------------------------------------
// Login with existing credentials → lands on /dashboard
// ---------------------------------------------------------------------------
test('login with correct credentials lands on /dashboard', async ({ page }) => {
  const email = uniqueEmail('login');
  const password = 'password123';

  // Register first
  await page.goto('/register');
  await page.fill('input[name="name"]', 'Login Test User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // Log out
  await page.click('a[href="/logout"]');
  await expect(page).toHaveURL('/login');

  // Log back in
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});

// ---------------------------------------------------------------------------
// Login with wrong password → stays on /login with error
// ---------------------------------------------------------------------------
test('login with wrong password shows error and stays on /login', async ({ page }) => {
  const email = uniqueEmail('wrongpw');

  // Register
  await page.goto('/register');
  await page.fill('input[name="name"]', 'Wrong PW User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'correctPassword1');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // Logout
  await page.click('a[href="/logout"]');

  // Attempt login with wrong password
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'wrongPassword!');
  await page.click('button[type="submit"]');

  // Should remain on /login
  await expect(page).toHaveURL('/login');

  // Error message should be visible
  await expect(page.locator('body')).toContainText(/invalid email or password/i);
});
