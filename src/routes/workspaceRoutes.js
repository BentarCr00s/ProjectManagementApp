'use strict';
const express = require('express');
const workspaceModel = require('../models/workspaceModel');
const listModel = require('../models/listModel');

const router = express.Router();

// GET /dashboard - List all workspaces
router.get('/dashboard', async (req, res) => {
  try {
    const workspaces = await workspaceModel.findByMember(req.session.userId);
    res.render('pages/dashboard', { title: 'Dashboard', workspaces });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST /workspaces - Create new workspace
router.post('/workspaces', async (req, res) => {
  const { name } = req.body;
  try {
    const workspace = await workspaceModel.create({ name, ownerId: req.session.userId });
    res.redirect(`/workspaces/${workspace.id}`);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Middleware to check workspace membership and inject into res.locals
router.use('/workspaces/:id', async (req, res, next) => {
  try {
    const isMember = await workspaceModel.isMember(req.params.id, req.session.userId);
    if (!isMember) return res.status(403).send('Forbidden');
    
    const workspace = await workspaceModel.findById(req.params.id);
    const lists = await listModel.findByWorkspace(req.params.id);
    
    res.locals.currentWorkspace = workspace;
    res.locals.workspaceLists = lists;
    
    // Also load all user workspaces for the sidebar switcher
    res.locals.workspaces = await workspaceModel.findByMember(req.session.userId);
    
    next();
  } catch (error) {
    console.error('Workspace middleware error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /workspaces/:id - Redirect to first list or show empty state
router.get('/workspaces/:id', (req, res) => {
  if (res.locals.workspaceLists && res.locals.workspaceLists.length > 0) {
    res.redirect(`/workspaces/${req.params.id}/lists/${res.locals.workspaceLists[0].id}`);
  } else {
    res.render('pages/workspace-empty', { title: res.locals.currentWorkspace.name });
  }
});

// POST /workspaces/:id/lists - Create new list
router.post('/workspaces/:id/lists', async (req, res) => {
  const { name } = req.body;
  try {
    const list = await listModel.create({ name, workspaceId: req.params.id });
    res.redirect(`/workspaces/${req.params.id}/lists/${list.id}`);
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
