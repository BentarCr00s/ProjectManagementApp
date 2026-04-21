# Database Schema Reference

Schema is defined in `src/config/migrate.js`. The database engine is **libSQL** (SQLite-compatible), accessed via `@tursodatabase/database`. In development it runs as a local SQLite file; in production it connects to Turso cloud.

---

## Tables

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | Display name |
| email | TEXT | NOT NULL UNIQUE | Login email |
| password_hash | TEXT | NOT NULL | bcrypt hash |
| avatar_color | TEXT | NOT NULL DEFAULT `#4070ff` | Hex color for avatar |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation time |

---

### workspaces

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | Workspace display name |
| owner_id | TEXT | NOT NULL, FK → users(id) ON DELETE CASCADE | User who created the workspace |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |

---

### workspace_members

Junction table linking users to workspaces with a role.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| workspace_id | TEXT | NOT NULL, PK, FK → workspaces(id) ON DELETE CASCADE | Workspace reference |
| user_id | TEXT | NOT NULL, PK, FK → users(id) ON DELETE CASCADE | User reference |
| role | TEXT | NOT NULL DEFAULT `member` | Member's role (`owner`, `admin`, `member`) |

Primary key is `(workspace_id, user_id)`.

---

### spaces

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | Space display name |
| workspace_id | TEXT | NOT NULL, FK → workspaces(id) ON DELETE CASCADE | Parent workspace |
| color | TEXT | NOT NULL DEFAULT `#4070ff` | Accent color |
| icon | TEXT | NOT NULL DEFAULT `🚀` | Emoji icon |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |

---

### lists

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | List display name |
| space_id | TEXT | FK → spaces(id) ON DELETE SET NULL | Optional parent space |
| workspace_id | TEXT | NOT NULL, FK → workspaces(id) ON DELETE CASCADE | Parent workspace |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |

---

### tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| title | TEXT | NOT NULL | Task title |
| description | TEXT | — | Task body text |
| status | TEXT | NOT NULL DEFAULT `TODO` | Current status enum |
| priority | TEXT | NOT NULL DEFAULT `normal` | Priority enum |
| list_id | TEXT | NOT NULL, FK → lists(id) ON DELETE CASCADE | Parent list |
| assignee_id | TEXT | FK → users(id) ON DELETE SET NULL | Assigned user (nullable) |
| due_date | TEXT | — | ISO date string |
| time_estimate | INTEGER | DEFAULT 0 | Estimated hours |
| time_tracked | INTEGER | DEFAULT 0 | Cumulative tracked seconds |
| created_by | TEXT | NOT NULL, FK → users(id) ON DELETE CASCADE | Task creator |
| position | INTEGER | DEFAULT 0 | Sort order within list |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update time |

---

### subtasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| title | TEXT | NOT NULL | Subtask title |
| status | TEXT | NOT NULL DEFAULT `TODO` | Status enum |
| task_id | TEXT | NOT NULL, FK → tasks(id) ON DELETE CASCADE | Parent task |
| assignee_id | TEXT | FK → users(id) ON DELETE SET NULL | Assigned user (nullable) |
| position | INTEGER | DEFAULT 0 | Sort order |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |

---

### comments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| content | TEXT | NOT NULL | Comment body |
| task_id | TEXT | NOT NULL, FK → tasks(id) ON DELETE CASCADE | Parent task |
| user_id | TEXT | NOT NULL, FK → users(id) ON DELETE CASCADE | Author |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Post time |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Edit time |

---

### time_entries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| task_id | TEXT | NOT NULL, FK → tasks(id) ON DELETE CASCADE | Tracked task |
| user_id | TEXT | NOT NULL, FK → users(id) ON DELETE CASCADE | User who tracked |
| started_at | DATETIME | NOT NULL | Timer start |
| ended_at | DATETIME | — | Timer stop (NULL = still running) |
| duration_seconds | INTEGER | DEFAULT 0 | Computed duration |

---

### tags

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | Tag label |
| color | TEXT | NOT NULL DEFAULT `#6b7280` | Display color |
| workspace_id | TEXT | NOT NULL, FK → workspaces(id) ON DELETE CASCADE | Owning workspace |

---

### task_tags

Junction table linking tasks to tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| task_id | TEXT | NOT NULL, PK, FK → tasks(id) ON DELETE CASCADE | Task reference |
| tag_id | TEXT | NOT NULL, PK, FK → tags(id) ON DELETE CASCADE | Tag reference |

Primary key is `(task_id, tag_id)`.

---

## Entity Relationship Diagram

```
users
  └─< workspace_members >─ workspaces
                                └─< spaces
                                      └─< lists
                                            └─< tasks
                                                  ├─< subtasks
                                                  ├─< comments
                                                  ├─< time_entries
                                                  └─< task_tags >─ tags
```

---

## Enum Values

### Task `status`
| Value | Meaning |
|-------|---------|
| `TODO` | Not started |
| `IN_PROGRESS` | Actively being worked on |
| `REVIEW` | Awaiting review |
| `DONE` | Completed |

### Task `priority`
| Value | Color |
|-------|-------|
| `urgent` | Red `#ef4444` |
| `high` | Orange `#f97316` |
| `normal` | Blue `#3b82f6` |
| `low` | Gray `#9ca3af` |

### `workspace_members` `role`
| Value | Permissions |
|-------|-------------|
| `owner` | Full control, can delete workspace |
| `admin` | Can add/remove members, rename workspace, delete lists |
| `member` | Can view and create tasks, rename lists |

---

## Indexes

| Index | Column(s) | Reason |
|-------|-----------|--------|
| `idx_tasks_list_id` | `tasks(list_id)` | Fast task retrieval per list (primary query pattern) |
| `idx_tasks_assignee` | `tasks(assignee_id)` | Look up tasks assigned to a user |
| `idx_tasks_assignee_id` | `tasks(assignee_id)` | Duplicate index (also present; covers the same column) |
| `idx_tasks_status` | `tasks(status)` | Filter tasks by status (Kanban/list view) |
| `idx_tasks_due_date` | `tasks(due_date)` | Range queries for due date filtering |
| `idx_subtasks_task_id` | `subtasks(task_id)` | Fast subtask retrieval per task |
| `idx_comments_task_id` | `comments(task_id)` | Fast comment retrieval per task |
| `idx_lists_workspace` | `lists(workspace_id)` | Sidebar list loading per workspace |
| `idx_users_email` | `users(email)` | Login lookup by email |
| `idx_workspace_members_user` | `workspace_members(user_id)` | Dashboard: all workspaces for a user |
| `idx_workspace_members_workspace` | `workspace_members(workspace_id)` | Member list for a workspace |
| `idx_time_entries_task` | `time_entries(task_id)` | Time entries per task |
| `idx_time_entries_user` | `time_entries(user_id)` | Time entries per user |
