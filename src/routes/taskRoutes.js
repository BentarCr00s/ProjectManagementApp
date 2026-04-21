'use strict';
const express = require('express');
const taskModel = require('../models/taskModel');
const commentModel = require('../models/commentModel');
const timeModel = require('../models/timeModel');

const router = express.Router();

// GET /tasks/:id - View task modal/detail (Partial HTML for HTMX/AJAX or full page)
router.get('/:id', async (req, res) => {
  try {
    const task = await taskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comments = await commentModel.findByTask(task.id);
    const activeTimer = await timeModel.getActiveEntry(task.id, req.session.userId);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
       // Return JSON for client-side rendering
       return res.json({ task, comments, activeTimer });
    }
    
    // Fallback: render full page
    res.render('pages/task-detail', { title: task.title, task, comments, activeTimer });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
