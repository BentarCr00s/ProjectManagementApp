# API Reference

**Base URL:** `http://localhost:3000`

**Auth:** Session-based. The browser sends the session cookie automatically. No `Authorization` header needed.

**Content-Type:** All `POST` and `PUT` requests with a body must use `application/json` (or `application/x-www-form-urlencoded` for HTML form submissions).

---

## 1. Authentication

### GET /login

**Description:** Render the login page
**Auth required:** No

**Success:** `200 OK` — HTML page

---

### POST /login

**Description:** Authenticate a user and start a session
**Auth required:** No

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | User's password (min 6 chars) |

**Success:** `302 Redirect` → `/dashboard`

**Errors:** `400` validation failed · `401` invalid email or password · `500` server error

---

### GET /register

**Description:** Render the registration page
**Auth required:** No

**Success:** `200 OK` — HTML page

---

### POST /register

**Description:** Create a new user account and start a session
**Auth required:** No

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Display name (min 2 chars) |
| email | string | Yes | Email address (must contain `@`) |
| password | string | Yes | Password (min 6 chars) |

**Success:** `302 Redirect` → `/dashboard`

**Errors:** `400` email already in use or validation failed · `500` server error

---

### GET /logout

**Description:** Destroy the session and redirect to login
**Auth required:** No

**Success:** `302 Redirect` → `/login`

---

## 2. Workspaces (Page Routes)

> All workspace page routes require authentication. Unauthenticated requests redirect to `/login`.

### GET /dashboard

**Description:** List all workspaces the current user is a member of
**Auth required:** Yes

**Success:** `200 OK` — HTML dashboard page

---

### POST /workspaces

**Description:** Create a new workspace; current user becomes the owner
**Auth required:** Yes

**Request body (form):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Workspace name |

**Success:** `302 Redirect` → `/workspaces/:id`

---

### GET /workspaces/:id

**Description:** Redirect to the first list in the workspace, or show empty state if no lists exist
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Success:** `302 Redirect` → first list, or `200 OK` empty-state HTML page

**Errors:** `403` not a workspace member

---

### POST /workspaces/:id/lists

**Description:** Create a new list inside a workspace
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Request body (form):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | List name |

**Success:** `302 Redirect` → `/workspaces/:id/lists/:listId`

**Errors:** `403` not a workspace member

---

## 3. Lists (Page Routes)

### GET /workspaces/:id/lists/:listId

**Description:** Redirect to the list view for this list
**Auth required:** Yes
**URL params:** `:id` — workspace ID · `:listId` — list ID

**Success:** `302 Redirect` → `/workspaces/:id/lists/:listId/list`

**Errors:** `404` list not found

---

### GET /workspaces/:id/lists/:listId/list

**Description:** Render the list view with tasks grouped by status
**Auth required:** Yes
**URL params:** `:id` — workspace ID · `:listId` — list ID

**Success:** `200 OK` — HTML page (tasks grouped: TODO, IN_PROGRESS, REVIEW, DONE)

**Errors:** `404` list not found

---

### GET /workspaces/:id/lists/:listId/board

**Description:** Render the Kanban board view with tasks grouped by status
**Auth required:** Yes
**URL params:** `:id` — workspace ID · `:listId` — list ID

**Success:** `200 OK` — HTML page (Kanban columns per status)

**Errors:** `404` list not found

---

## 4. Tasks (Page Routes)

### GET /tasks/:id

**Description:** View task detail. Returns JSON when the request is XHR or `Accept` header includes `json`; otherwise renders a full HTML page.
**Auth required:** Yes
**URL params:** `:id` — task ID

**Success (browser):** `200 OK` — HTML task-detail page

**Success (XHR / `Accept: application/json`):**
```json
{
  "task": {
    "id": "uuid",
    "title": "Fix login bug",
    "status": "TODO",
    "priority": "normal",
    "assignee_name": "Alice",
    "assignee_color": "#4070ff",
    "creator_name": "Bob"
  },
  "comments": [
    { "id": "uuid", "content": "Looks good", "user_name": "Alice", "created_at": "2026-04-20T00:00:00.000Z" }
  ],
  "activeTimer": null
}
```

**Errors:** `404` task not found

---

## 5. API — Tasks

> All `/api/*` routes require authentication. Unauthenticated requests return `401 JSON`.

### POST /api/tasks

**Description:** Create a new task; the creator is auto-assigned as the assignee
**Auth required:** Yes

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Task title (max 255 chars) |
| listId | string | Yes | ID of the list to add the task to |
| description | string | No | Task description |
| priority | string | No | `urgent` · `high` · `normal` · `low` (default `normal`) |

**Success:** `201 Created`
```json
{
  "id": "uuid",
  "title": "Fix login bug",
  "description": "",
  "status": "TODO",
  "priority": "normal",
  "list_id": "uuid",
  "assignee_id": "uuid",
  "due_date": null,
  "time_estimate": 0,
  "time_tracked": 0,
  "created_by": "uuid",
  "position": 0,
  "created_at": "2026-04-20T00:00:00.000Z",
  "updated_at": "2026-04-20T00:00:00.000Z"
}
```

**Errors:** `400` validation failed · `401` not authenticated

---

### PUT /api/tasks/:id/status

**Description:** Update only the status of a task
**Auth required:** Yes
**URL params:** `:id` — task ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | `TODO` · `IN_PROGRESS` · `REVIEW` · `DONE` |

**Success:** `200 OK` — updated task object

**Errors:** `400` invalid status · `401` not authenticated

---

### PUT /api/tasks/:id

**Description:** Update one or more fields of a task
**Auth required:** Yes
**URL params:** `:id` — task ID

**Request body (all fields optional):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | Task title |
| description | string | No | Task description |
| status | string | No | `TODO` · `IN_PROGRESS` · `REVIEW` · `DONE` |
| priority | string | No | `urgent` · `high` · `normal` · `low` |
| assignee_id | string | No | User ID to assign |
| due_date | string | No | ISO date string |
| time_estimate | integer | No | Estimated hours |
| position | integer | No | Sort position within list |

**Success:** `200 OK` — updated task object

**Errors:** `401` not authenticated

---

### DELETE /api/tasks/:id

**Description:** Delete a task permanently
**Auth required:** Yes
**URL params:** `:id` — task ID

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `404` task not found

---

### GET /api/tasks/search

**Description:** Search tasks within a workspace by title or description
**Auth required:** Yes

**Query params:**
| Param | Required | Description |
|-------|----------|-------------|
| `q` | Yes | Search query string |
| `workspaceId` | Yes | Workspace to search within |

**Success:** `200 OK`
```json
[
  { "id": "uuid", "title": "Fix login bug", "status": "TODO", "priority": "normal" }
]
```

**Errors:** `400` missing `q` or `workspaceId` · `401` not authenticated · `403` not a workspace member

---

## 6. API — Subtasks

### POST /api/tasks/:id/subtasks

**Description:** Create a subtask under a task
**Auth required:** Yes
**URL params:** `:id` — parent task ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Subtask title |
| assigneeId | string | No | User ID to assign |

**Success:** `201 Created`
```json
{
  "id": "uuid",
  "title": "Write unit tests",
  "task_id": "uuid",
  "status": "TODO",
  "assignee_id": null
}
```

**Errors:** `400` title required · `401` not authenticated · `404` parent task not found

---

### PUT /api/tasks/:id/subtasks/:subtaskId

**Description:** Update a subtask's title or status
**Auth required:** Yes
**URL params:** `:id` — parent task ID · `:subtaskId` — subtask ID

**Request body (all optional):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | New title |
| status | string | No | `TODO` · `IN_PROGRESS` · `REVIEW` · `DONE` |

**Success:** `200 OK` — updated subtask object

**Errors:** `401` not authenticated · `404` subtask not found or does not belong to task

---

### DELETE /api/tasks/:id/subtasks/:subtaskId

**Description:** Delete a subtask
**Auth required:** Yes
**URL params:** `:id` — parent task ID · `:subtaskId` — subtask ID

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `404` subtask not found or does not belong to task

---

## 7. API — Comments

### POST /api/tasks/:id/comments

**Description:** Add a comment to a task
**Auth required:** Yes
**URL params:** `:id` — task ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Comment text (max 5000 chars) |

**Success:** `201 Created`
```json
{
  "id": "uuid",
  "content": "Looks good to me!",
  "task_id": "uuid",
  "user_id": "uuid",
  "created_at": "2026-04-20T00:00:00.000Z"
}
```

**Errors:** `400` validation failed · `401` not authenticated

---

### PUT /api/tasks/:id/comments/:commentId

**Description:** Edit a comment (only the comment author can edit)
**Auth required:** Yes
**URL params:** `:id` — task ID · `:commentId` — comment ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Updated comment text (max 5000 chars) |

**Success:** `200 OK` — updated comment object

**Errors:** `400` validation failed · `401` not authenticated · `403` not comment owner · `404` comment not found

---

### DELETE /api/tasks/:id/comments/:commentId

**Description:** Delete a comment (only the comment author can delete)
**Auth required:** Yes
**URL params:** `:id` — task ID · `:commentId` — comment ID

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `403` not comment owner · `404` comment not found

---

## 8. API — Time Tracking

### POST /api/tasks/:id/time/start

**Description:** Start a time tracking timer for the current user on a task. If a timer is already active for this task/user it is stopped first.
**Auth required:** Yes
**URL params:** `:id` — task ID

**Success:** `201 Created`
```json
{
  "id": "uuid",
  "task_id": "uuid",
  "user_id": "uuid",
  "started_at": "2026-04-20T00:00:00.000Z"
}
```

**Errors:** `401` not authenticated

---

### POST /api/tasks/:id/time/stop

**Description:** Stop the active timer for the current user on a task. Updates `time_tracked` on the task.
**Auth required:** Yes
**URL params:** `:id` — task ID

**Success:** `200 OK`
```json
{
  "id": "uuid",
  "task_id": "uuid",
  "user_id": "uuid",
  "started_at": "2026-04-20T00:00:00.000Z",
  "ended_at": "2026-04-20T01:00:00.000Z",
  "duration_seconds": 3600
}
```

If no active timer: `200 OK` `{ "message": "No active timer" }`

**Errors:** `401` not authenticated

---

## 9. API — Tags

### GET /api/workspaces/:id/tags

**Description:** List all tags defined in a workspace
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Success:** `200 OK`
```json
[
  { "id": "uuid", "name": "bug", "color": "#ef4444", "workspace_id": "uuid" }
]
```

**Errors:** `401` not authenticated · `403` not a workspace member

---

### POST /api/workspaces/:id/tags

**Description:** Create a new tag in a workspace
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tag label |
| color | string | No | Hex color string (default `#6b7280`) |

**Success:** `201 Created`
```json
{ "id": "uuid", "name": "bug", "color": "#ef4444", "workspace_id": "uuid" }
```

**Errors:** `400` name required · `401` not authenticated · `403` not a workspace member

---

### POST /api/tasks/:id/tags

**Description:** Attach an existing tag to a task
**Auth required:** Yes
**URL params:** `:id` — task ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tagId | string | Yes | ID of the tag to attach |

**Success:** `201 Created`
```json
{ "success": true }
```

**Errors:** `400` tagId required · `401` not authenticated · `404` task or tag not found

---

### DELETE /api/tasks/:id/tags/:tagId

**Description:** Remove a tag from a task
**Auth required:** Yes
**URL params:** `:id` — task ID · `:tagId` — tag ID

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `404` task not found

---

## 10. API — Workspace Management

### GET /api/workspaces/:id/members

**Description:** List all members of a workspace
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Success:** `200 OK`
```json
[
  { "id": "uuid", "name": "Alice", "email": "alice@example.com", "avatar_color": "#4070ff", "role": "owner" }
]
```

**Errors:** `401` not authenticated · `403` not a workspace member

---

### POST /api/workspaces/:id/members

**Description:** Add a user to a workspace (owner/admin only)
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | ID of the user to add |
| role | string | No | `owner` · `admin` · `member` (default `member`) |

**Success:** `201 Created`
```json
{ "success": true }
```

**Errors:** `400` userId required · `401` not authenticated · `403` not owner/admin

---

### DELETE /api/workspaces/:id/members/:userId

**Description:** Remove a member from a workspace (owner/admin only)
**Auth required:** Yes
**URL params:** `:id` — workspace ID · `:userId` — user ID to remove

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `403` not owner/admin

---

### PUT /api/workspaces/:id

**Description:** Rename a workspace (owner/admin only)
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | New workspace name (max 100 chars) |

**Success:** `200 OK` — updated workspace object

**Errors:** `400` validation failed · `401` not authenticated · `403` not owner/admin

---

### DELETE /api/workspaces/:id

**Description:** Delete a workspace permanently (owner only)
**Auth required:** Yes
**URL params:** `:id` — workspace ID

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `403` not the workspace owner · `404` workspace not found

---

## 11. API — List Management

### PUT /api/lists/:id

**Description:** Rename a list (any workspace member)
**Auth required:** Yes
**URL params:** `:id` — list ID

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | New list name (max 100 chars) |

**Success:** `200 OK` — updated list object

**Errors:** `400` validation failed · `401` not authenticated · `403` not a workspace member · `404` list not found

---

### DELETE /api/lists/:id

**Description:** Delete a list permanently (owner/admin only)
**Auth required:** Yes
**URL params:** `:id` — list ID

**Success:** `200 OK`
```json
{ "success": true }
```

**Errors:** `401` not authenticated · `403` not owner/admin · `404` list not found

---

## 12. API — Search

See [GET /api/tasks/search](#get-apitaskssearch) in Section 5.

---

## 13. Utility

### GET /health

**Description:** Health check — no auth required
**Auth required:** No

**Success:** `200 OK`
```json
{ "status": "ok", "timestamp": "2026-04-20T00:00:00.000Z" }
```
