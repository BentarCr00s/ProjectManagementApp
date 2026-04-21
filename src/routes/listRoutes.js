'use strict';
const express = require('express');
const taskModel = require('../models/taskModel');
const listModel = require('../models/listModel');

const router = express.Router({ mergeParams: true }); // Access :id from workspace router

// Middleware to inject list into res.locals
router.use('/:listId', async (req, res, next) => {
  try {
    const list = await listModel.findById(req.params.listId);
    if (!list || list.workspace_id !== req.params.id) {
      return res.status(404).send('List not found');
    }
    res.locals.currentList = list;
    next();
  } catch (error) {
    console.error('List middleware error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /workspaces/:id/lists/:listId - Default to List View
router.get('/:listId', (req, res) => {
  res.redirect(`/workspaces/${req.params.id}/lists/${req.params.listId}/list`);
});

// GET /workspaces/:id/lists/:listId/list - List View
router.get('/:listId/list', async (req, res) => {
  try {
    const tasks = await taskModel.findByList(req.params.listId);
    // Group tasks by status for List View (optional, but good for UI)
    const groupedTasks = {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      REVIEW: tasks.filter(t => t.status === 'REVIEW'),
      DONE: tasks.filter(t => t.status === 'DONE'),
    };
    res.render('pages/list-view', { 
      title: `${res.locals.currentList.name} | List`, 
      tasks: groupedTasks,
      viewType: 'list'
    });
  } catch (error) {
    console.error('List view error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /workspaces/:id/lists/:listId/board - Board View (Kanban)
router.get('/:listId/board', async (req, res) => {
  try {
    const tasks = await taskModel.findByList(req.params.listId);
    const boardData = {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      REVIEW: tasks.filter(t => t.status === 'REVIEW'),
      DONE: tasks.filter(t => t.status === 'DONE'),
    };
    res.render('pages/board-view', { 
      title: `${res.locals.currentList.name} | Board`, 
      boardData,
      viewType: 'board'
    });
  } catch (error) {
    console.error('Board view error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
