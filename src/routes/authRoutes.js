'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { validate, authRules } = require('../middlewares/validate');

// Login only needs email + password
const loginRules = {
  email:    authRules.email,
  password: authRules.password,
};

const router = express.Router();

// GET /login
router.get('/login', (req, res) => {
  res.render('pages/login', { layout: 'auth', title: 'Log in to ClickUp Replica' });
});

// POST /login
router.post('/login', validate(loginRules), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).render('pages/login', { layout: 'auth', error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).render('pages/login', { layout: 'auth', error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.user = { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color };
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('pages/login', { layout: 'auth', error: 'Internal server error' });
  }
});

// GET /register
router.get('/register', (req, res) => {
  res.render('pages/register', { layout: 'auth', title: 'Sign up for ClickUp Replica' });
});

// POST /register
router.post('/register', validate(authRules), async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if email exists
    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(400).render('pages/register', { layout: 'auth', error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.create({ name, email, passwordHash });

    req.session.userId = user.id;
    req.session.user = { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color };
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).render('pages/register', { layout: 'auth', error: 'Internal server error' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});

module.exports = router;
