# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.js >> user can login and see dashboard
- Location: tests\e2e\login.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="name"]')
    - locator resolved to <input type="text" name="name" required="" autofocus="" class="form-input" placeholder="e.g. Acme Corp"/>
    - fill("My E2E Workspace")
  - attempting fill action
    2 × waiting for element to be visible, enabled and editable
      - element is not visible
    - retrying fill action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and editable
      - element is not visible
    - retrying fill action
      - waiting 100ms
    58 × waiting for element to be visible, enabled and editable
       - element is not visible
     - retrying fill action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]: ⬡
      - text: TaskSync
    - generic [ref=e7]:
      - generic [ref=e8]: Workspaces
      - generic [ref=e9]: No workspaces
    - generic [ref=e11]:
      - generic [ref=e12]: E
      - generic [ref=e13]:
        - generic [ref=e14]: E2E User
        - link "Logout" [ref=e15] [cursor=pointer]:
          - /url: /logout
  - main [ref=e16]:
    - generic [ref=e17]:
      - heading "Dashboard" [level=1] [ref=e19]
      - button [ref=e21] [cursor=pointer]:
        - img [ref=e22]
    - generic [ref=e25]:
      - generic [ref=e26]:
        - heading "Good morning, E2E" [level=2] [ref=e27]
        - paragraph [ref=e28]: Here's what's happening in your workspaces.
      - generic [ref=e29]:
        - generic [ref=e30]:
          - heading "Your Workspaces" [level=3] [ref=e32]
          - generic [ref=e34] [cursor=pointer]:
            - generic [ref=e36]: +
            - heading "Create new Workspace" [level=4] [ref=e37]
        - generic [ref=e38]:
          - heading "Inbox" [level=3] [ref=e39]
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e42]: 🔔
              - generic [ref=e43]:
                - paragraph [ref=e44]: Welcome to TaskSync!
                - paragraph [ref=e45]: Just now
            - paragraph [ref=e47]: You're all caught up.
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test('user can login and see dashboard', async ({ page }) => {
  4  |   // We mock a login because we need data, but for a true E2E we'd register first
  5  |   await page.goto('/register');
  6  |   await page.fill('input[name="name"]', 'E2E User');
  7  |   await page.fill('input[name="email"]', `e2e-${Date.now()}@example.com`);
  8  |   await page.fill('input[name="password"]', 'password123');
  9  |   await page.click('button[type="submit"]');
  10 | 
  11 |   // Verify dashboard
  12 |   await expect(page).toHaveURL('/dashboard');
  13 |   await expect(page.locator('h2')).toContainText('Good morning, E2E');
  14 |   
  15 |   // Create workspace
  16 |   await page.click('text=Create new Workspace');
> 17 |   await page.fill('input[name="name"]', 'My E2E Workspace');
     |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  18 |   await page.click('button[type="submit"]:has-text("Create")');
  19 |   
  20 |   // It redirects to empty state because no lists
  21 |   await expect(page.getByText('Create your first List')).toBeVisible();
  22 |   
  23 |   // Create list
  24 |   await page.click('text=+ Create Default List');
  25 |   
  26 |   // Verify list view
  27 |   await expect(page).toHaveURL(/.*\/list$/);
  28 |   await expect(page.locator('h1')).toContainText('General Task List');
  29 | });
  30 | 
```