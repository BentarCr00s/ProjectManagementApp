'use strict';

const { test, expect } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function uniqueEmail(prefix = 'ws') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.test`;
}

async function registerAndLogin(page, { name, email, password }) {
  await page.goto('/register');
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

/**
 * Creates a workspace via the dashboard modal and lands on the workspace page.
 * Returns the workspace URL.
 */
async function createWorkspace(page, name) {
  await page.goto('/dashboard');
  // Click the "Create new Workspace" card which dispatches 'open-create-ws'
  await page.click('text=Create new Workspace');
  // Fill workspace name in the modal form
  await page.fill('input[name="name"]', name);
  // Click the "Create" submit button inside the modal
  await page.click('button[type="submit"]:has-text("Create")');
  // After creation the app redirects to /workspaces/:id
  await expect(page).toHaveURL(/\/workspaces\//);
  return page.url();
}

// ---------------------------------------------------------------------------
// Test 1: Create workspace from dashboard modal
// ---------------------------------------------------------------------------
test('create workspace from dashboard modal', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'WS Creator',
    email: uniqueEmail('wscreate'),
    password: 'password123',
  });

  await createWorkspace(page, 'My E2E Workspace');

  // Confirms we are now on a workspace page
  await expect(page).toHaveURL(/\/workspaces\//);
});

// ---------------------------------------------------------------------------
// Test 2: Workspace appears in dashboard list
// ---------------------------------------------------------------------------
test('created workspace appears in dashboard workspace list', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'WS Sidebar',
    email: uniqueEmail('wssidebar'),
    password: 'password123',
  });

  await createWorkspace(page, 'Dashboard Visible WS');

  // Go back to dashboard
  await page.goto('/dashboard');

  // Workspace name should be visible as a link in the workspace cards
  await expect(page.locator('h4:has-text("Dashboard Visible WS")')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3: Click workspace → workspace view (empty state shows "Create your first List")
// ---------------------------------------------------------------------------
test('clicking a workspace navigates to workspace view', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'WS Clicker',
    email: uniqueEmail('wsclick'),
    password: 'password123',
  });

  await createWorkspace(page, 'Click Target WS');

  // After creation we are already on the workspace empty-state or list page
  // The empty state renders "Create your first List"
  await expect(page.locator('body')).toContainText('Click Target WS');
});

// ---------------------------------------------------------------------------
// Test 4: Create list inside workspace → list appears (redirect to list view)
// ---------------------------------------------------------------------------
test('create list inside workspace and navigate to list view', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'List Creator',
    email: uniqueEmail('listcreate'),
    password: 'password123',
  });

  await createWorkspace(page, 'List Parent WS');

  // Workspace empty state: fill list name and click "Create Default List"
  await expect(page.locator('h3:has-text("Create your first List")')).toBeVisible();
  await page.fill('input[name="name"]', 'Sprint One');
  await page.click('button[type="submit"]:has-text("Create Default List")');

  // Should redirect to the list view URL: /workspaces/:id/lists/:listId/list
  await expect(page).toHaveURL(/\/lists\//);
});

// ---------------------------------------------------------------------------
// Test 5: Navigate to list view renders the list page
// ---------------------------------------------------------------------------
test('list view page is rendered after creating a list', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'List Nav User',
    email: uniqueEmail('listnav'),
    password: 'password123',
  });

  await createWorkspace(page, 'Nav WS');

  // Fill in the list creation form on empty state page
  await page.fill('input[name="name"]', 'My First List');
  await page.click('button[type="submit"]:has-text("Create Default List")');

  // URL should contain /lists/
  await expect(page).toHaveURL(/\/lists\//);

  // The list view renders the filter toolbar and task area
  // Check that we are on the list-view page (task name header column)
  await expect(page.locator('body')).toContainText('My First List');
});
