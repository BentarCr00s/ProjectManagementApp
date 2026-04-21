'use strict';
const express = require('express');
const taskModel      = require('../models/taskModel');
const commentModel   = require('../models/commentModel');
const timeModel      = require('../models/timeModel');
const workspaceModel = require('../models/workspaceModel');
const listModel      = require('../models/listModel');
const tagModel       = require('../models/tagModel');
const { validate, taskRules, workspaceRules, listRules, commentRules } = require('../middlewares/validate');

const router = express.Router();

// --- Auth guard helper ---
function requireSession(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireSession);

// ============================================================
// TASK API
// ============================================================

// POST /api/tasks
router.post('/tasks', validate(taskRules), async (req, res) => {
  try {
    const { title, listId, description, priority } = req.body;
    const task = await taskModel.create({
      title,
      listId,
      description,
      priority,
      createdBy: req.session.userId,
      assigneeId: req.session.userId,
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('API create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/status
router.put('/tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!taskModel.STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const task = await taskModel.updateStatus(req.params.id, status);
    res.json(task);
  } catch (error) {
    console.error('API update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await taskModel.update(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    console.error('API update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await taskModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('API delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/search?q=...&workspaceId=...
router.get('/tasks/search', async (req, res) => {
  try {
    const { q, workspaceId } = req.query;
    if (!q || !workspaceId) {
      return res.status(400).json({ error: 'Missing q or workspaceId query params' });
    }
    // Verify membership
    const isMember = await workspaceModel.isMember(workspaceId, req.session.userId);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    const tasks = await taskModel.search(q, workspaceId);
    res.json(tasks);
  } catch (error) {
    console.error('API search tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// SUBTASK API
// ============================================================

// POST /api/tasks/:id/subtasks
router.post('/tasks/:id/subtasks', async (req, res) => {
  try {
    const { title, assigneeId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const task = await taskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const subtask = await taskModel.createSubtask({
      taskId: req.params.id,
      title: title.trim(),
      assigneeId: assigneeId || null,
    });
    res.status(201).json(subtask);
  } catch (error) {
    console.error('API create subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/subtasks/:subtaskId
router.put('/tasks/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const { title, status } = req.body;
    const subtask = await taskModel.findSubtaskById(req.params.subtaskId);
    if (!subtask || subtask.task_id !== req.params.id) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    await taskModel.updateSubtask(req.params.subtaskId, { title, status });
    const updated = await taskModel.findSubtaskById(req.params.subtaskId);
    res.json(updated);
  } catch (error) {
    console.error('API update subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id/subtasks/:subtaskId
router.delete('/tasks/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const subtask = await taskModel.findSubtaskById(req.params.subtaskId);
    if (!subtask || subtask.task_id !== req.params.id) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    await taskModel.deleteSubtask(req.params.subtaskId);
    res.json({ success: true });
  } catch (error) {
    console.error('API delete subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// COMMENT API
// ============================================================

// POST /api/tasks/:id/comments
router.post('/tasks/:id/comments', validate(commentRules), async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await commentModel.create({
      content,
      taskId: req.params.id,
      userId: req.session.userId,
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error('API create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/comments/:commentId
router.put('/tasks/:id/comments/:commentId', validate(commentRules), async (req, res) => {
  try {
    const comment = await commentModel.findById(req.params.commentId);
    if (!comment || comment.task_id !== req.params.id) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden: you do not own this comment' });
    }
    const updated = await commentModel.update(req.params.commentId, { content: req.body.content });
    res.json(updated);
  } catch (error) {
    console.error('API edit comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id/comments/:commentId
router.delete('/tasks/:id/comments/:commentId', async (req, res) => {
  try {
    const comment = await commentModel.findById(req.params.commentId);
    if (!comment || comment.task_id !== req.params.id) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden: you do not own this comment' });
    }
    await commentModel.delete(req.params.commentId);
    res.json({ success: true });
  } catch (error) {
    console.error('API delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// TIME TRACKING API
// ============================================================

// POST /api/tasks/:id/time/start
router.post('/tasks/:id/time/start', async (req, res) => {
  try {
    const entry = await timeModel.startEntry({
      taskId: req.params.id,
      userId: req.session.userId,
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('API start timer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/time/stop
router.post('/tasks/:id/time/stop', async (req, res) => {
  try {
    const entry = await timeModel.stopActiveEntry(req.params.id, req.session.userId);
    res.json(entry || { message: 'No active timer' });
  } catch (error) {
    console.error('API stop timer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// WORKSPACE API
// ============================================================

// GET /api/workspaces/:id/members
router.get('/workspaces/:id/members', async (req, res) => {
  try {
    const isMember = await workspaceModel.isMember(req.params.id, req.session.userId);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });
    const members = await workspaceModel.getMembers(req.params.id);
    res.json(members);
  } catch (error) {
    console.error('API get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/workspaces/:id/members
router.post('/workspaces/:id/members', async (req, res) => {
  try {
    const role = await workspaceModel.getMemberRole(req.params.id, req.session.userId);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden: only owners/admins can add members' });
    }
    const { userId, role: memberRole = 'member' } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    await workspaceModel.addMember(req.params.id, userId, memberRole);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('API add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:id/members/:userId
router.delete('/workspaces/:id/members/:userId', async (req, res) => {
  try {
    const role = await workspaceModel.getMemberRole(req.params.id, req.session.userId);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden: only owners/admins can remove members' });
    }
    await workspaceModel.removeMember(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('API remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/workspaces/:id
router.put('/workspaces/:id', validate(workspaceRules), async (req, res) => {
  try {
    const role = await workspaceModel.getMemberRole(req.params.id, req.session.userId);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden: only owners/admins can update workspace' });
    }
    const updated = await workspaceModel.update(req.params.id, { name: req.body.name });
    res.json(updated);
  } catch (error) {
    console.error('API update workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:id
router.delete('/workspaces/:id', async (req, res) => {
  try {
    const workspace = await workspaceModel.findById(req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden: only the owner can delete this workspace' });
    }
    await workspaceModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('API delete workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// LIST API
// ============================================================

// PUT /api/lists/:id
router.put('/lists/:id', validate(listRules), async (req, res) => {
  try {
    const list = await listModel.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const isMember = await workspaceModel.isMember(list.workspace_id, req.session.userId);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });
    await listModel.update(req.params.id, { name: req.body.name });
    const updated = await listModel.findById(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('API update list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/lists/:id
router.delete('/lists/:id', async (req, res) => {
  try {
    const list = await listModel.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const role = await workspaceModel.getMemberRole(list.workspace_id, req.session.userId);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden: only owners/admins can delete lists' });
    }
    await listModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('API delete list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// TAG API
// ============================================================

// GET /api/workspaces/:id/tags
router.get('/workspaces/:id/tags', async (req, res) => {
  try {
    const isMember = await workspaceModel.isMember(req.params.id, req.session.userId);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });
    const tags = await tagModel.findByWorkspace(req.params.id);
    res.json(tags);
  } catch (error) {
    console.error('API get tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/workspaces/:id/tags
router.post('/workspaces/:id/tags', async (req, res) => {
  try {
    const isMember = await workspaceModel.isMember(req.params.id, req.session.userId);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const tag = await tagModel.create({ name: name.trim(), color, workspaceId: req.params.id });
    res.status(201).json(tag);
  } catch (error) {
    console.error('API create tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/tags
router.post('/tasks/:id/tags', async (req, res) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const { tagId } = req.body;
    if (!tagId) return res.status(400).json({ error: 'tagId is required' });
    const tag = await tagModel.findById(tagId);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    await tagModel.addToTask(req.params.id, tagId);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('API add tag to task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id/tags/:tagId
router.delete('/tasks/:id/tags/:tagId', async (req, res) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await tagModel.removeFromTask(req.params.id, req.params.tagId);
    res.json({ success: true });
  } catch (error) {
    console.error('API remove tag from task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
