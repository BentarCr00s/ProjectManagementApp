'use strict';

// Require auth: redirect to login if not authenticated
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.xhr || (req.headers.accept || '').indexOf('json') > -1) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login');
  }
  next();
}

// Redirect to dashboard if already logged in
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

// Inject user into res.locals for Pug templates
function setLocals(req, res, next) {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.path = req.path;
  next();
}

module.exports = {
  requireAuth,
  requireGuest,
  setLocals
};
