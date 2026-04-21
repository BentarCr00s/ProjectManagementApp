'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const morgan = require('morgan');

const { requireAuth, setLocals } = require('./middlewares/auth');

// Routes
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const listRoutes = require('./routes/listRoutes');
const taskRoutes = require('./routes/taskRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup (Pug)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session setup
app.use(session({
  store: new SQLiteStore({ dir: './', db: 'sessions.db' }),
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// Setup res.locals
app.use(setLocals);

// Health check (before auth)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public Routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.use('/', authRoutes);

// Protected Routes
app.use(requireAuth);
app.use('/', workspaceRoutes);
// Mount listRoutes directly on app with full path so mergeParams works correctly
app.use('/workspaces/:id/lists', listRoutes);
app.use('/tasks', taskRoutes);
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/dashboard', { title: '404 - Not Found', error: 'Page not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/dashboard', { title: 'Error', error: 'Something went wrong!' });
});

// Start Server (only if not imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 ClickUp Replica running on http://localhost:${PORT}`);
  });
}

module.exports = app;
