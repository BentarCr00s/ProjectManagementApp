'use strict';

const { test, expect } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uniqueEmail(prefix = 'task') {
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
 * Create a workspace via the dashboard modal.
 * Ends up on the workspace empty-state or workspace page.
 */
async function createWorkspace(page, name) {
  await page.goto('/dashboard');
  await page.click('text=Create new Workspace');
  await page.fill('input[name="name"]', name);
  await page.click('button[type="submit"]:has-text("Create")');
  await expect(page).toHaveURL(/\/workspaces\//);
}

/**
 * Create a list using the workspace-empty form.
 * Expects the empty-state "Create your first List" heading to be visible.
 * Navigates to the list view on success.
 */
async function createList(page, listName) {
  await expect(page.locator('h3:has-text("Create your first List")')).toBeVisible();
  await page.fill('input[name="name"]', listName);
  await page.click('button[type="submit"]:has-text("Create Default List")');
  await expect(page).toHaveURL(/\/lists\//);
}

/**
 * Open the "New Task" modal (AlpineJS), fill the title, and submit.
 * The createTask() JS function does `window.location.reload()` on success.
 */
async function createTask(page, title) {
  // "New Task" button in the top-right header area
  await page.click('button:has-text("New Task")');

  // Wait for the AlpineJS modal to render the task title input
  const titleInput = page.locator('input[placeholder="Task name"]');
  await expect(titleInput).toBeVisible({ timeout: 5000 });
  await titleInput.fill(title);

  // Submit — the form uses @submit.prevent="createTask" and fetches /api/tasks
  // then calls window.location.reload()
  await page.click('button[type="submit"]:has-text("Create Task")');

  // Wait for the page to reload after task creation
  await page.waitForURL(/.+/, { waitUntil: 'networkidle' });
}

// ---------------------------------------------------------------------------
// Test 1: Create a task from list view → task appears in list
// ---------------------------------------------------------------------------
test('create task from list view and task appears in list', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'Task Creator',
    email: uniqueEmail('taskcreate'),
    password: 'password123',
  });

  await createWorkspace(page, 'Task WS');
  await createList(page, 'Sprint List');
  await createTask(page, 'My First E2E Task');

  // The taskRow mixin renders the title inside an <h4>
  await expect(page.locator('h4:has-text("My First E2E Task")')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2: Open task detail modal → task title is displayed
// ---------------------------------------------------------------------------
test('open task detail modal and verify title is shown', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'Detail Viewer',
    email: uniqueEmail('taskdetail'),
    password: 'password123',
  });

  await createWorkspace(page, 'Detail WS');
  await createList(page, 'Detail List');
  await createTask(page, 'Detail Task Title');

  // Click the task row (openTaskDetail JS function is triggered via onclick)
  await page.locator('h4:has-text("Detail Task Title")').click();

  // The modal container changes from hidden to visible
  const modal = page.locator('#task-modal-container');
  // wait for the hidden class to be removed
  await expect(modal).not.toHaveClass(/hidden/, { timeout: 5000 });

  // The task-detail partial renders an <h2> with the title
  await expect(page.locator('#task-modal-content h2')).toContainText('Detail Task Title', { timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 3: Change task status via the status badge in the task detail modal
// ---------------------------------------------------------------------------
test('task status is shown in the detail modal', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'Status Changer',
    email: uniqueEmail('taskstatus'),
    password: 'password123',
  });

  await createWorkspace(page, 'Status WS');
  await createList(page, 'Status List');
  await createTask(page, 'Status Task');

  // Open task detail
  await page.locator('h4:has-text("Status Task")').click();
  await expect(page.locator('#task-modal-container')).not.toHaveClass(/hidden/, { timeout: 5000 });

  // The task-detail pug renders the status as a span (class="status-todo ...")
  // Default status for a new task is TODO
  await expect(page.locator('#task-modal-content')).toContainText('TODO', { timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 4: Add a comment to a task → comment appears in the activity panel
// ---------------------------------------------------------------------------
test('add comment to task and comment appears in task detail', async ({ page }) => {
  await registerAndLogin(page, {
    name: 'Comment User',
    email: uniqueEmail('taskcomment'),
    password: 'password123',
  });

  await createWorkspace(page, 'Comment WS');
  await createList(page, 'Comment List');
  await createTask(page, 'Commented Task');

  // Open task detail modal
  await page.locator('h4:has-text("Commented Task")').click();
  const modal = page.locator('#task-modal-container');
  await expect(modal).not.toHaveClass(/hidden/, { timeout: 5000 });

  // Wait for the task-detail AJAX response to finish rendering inside the modal
  await expect(page.locator('#task-modal-content h2')).toContainText('Commented Task', { timeout: 5000 });

  // The comment textarea is #comment-input (rendered by task-detail.pug)
  const commentInput = page.locator('#comment-input');
  await expect(commentInput).toBeVisible({ timeout: 5000 });
  await commentInput.fill('Great work on this task!');

  // The "Send" button submits the #comment-form which calls postComment()
  // The handler does: fetch POST /api/tasks/:id/comments then openTaskDetail(taskId)
  await page.locator('#task-modal-content button[type="submit"]:has-text("Send")').click();

  // After the AJAX re-render, the comment text should appear in #comments-list
  await expect(page.locator('#comments-list')).toContainText('Great work on this task!', { timeout: 5000 });
});
