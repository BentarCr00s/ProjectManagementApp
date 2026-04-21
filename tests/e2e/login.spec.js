const { test, expect } = require('@playwright/test');

test('user can login and see dashboard', async ({ page }) => {
  // We mock a login because we need data, but for a true E2E we'd register first
  await page.goto('/register');
  await page.fill('input[name="name"]', 'E2E User');
  await page.fill('input[name="email"]', `e2e-${Date.now()}@example.com`);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Verify dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h2')).toContainText('Good morning, E2E');
  
  // Create workspace
  await page.click('text=Create new Workspace');
  await page.fill('input[name="name"]', 'My E2E Workspace');
  await page.click('button[type="submit"]:has-text("Create")');
  
  // It redirects to empty state because no lists
  await expect(page.getByText('Create your first List')).toBeVisible();
  
  // Create list
  await page.click('text=+ Create Default List');
  
  // Verify list view
  await expect(page).toHaveURL(/.*\/list$/);
  await expect(page.locator('h1')).toContainText('General Task List');
});
