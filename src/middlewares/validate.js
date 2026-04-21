'use strict';

const STATUSES   = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

/**
 * Validates req.body fields against a rules map.
 * Rules per field: { required, minLength, maxLength, type, enum, contains }
 * On failure: res.status(400).json({ error: 'Validation failed', details: [...] })
 * On success: calls next()
 */
function validate(rules) {
  return function (req, res, next) {
    const details = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const missing = value === undefined || value === null || value === '';

      if (rule.required && missing) {
        details.push(`'${field}' is required`);
        continue; // skip further checks for this field
      }

      // If field is absent and not required, skip remaining checks
      if (missing) continue;

      const strVal = String(value);

      if (rule.type === 'string' && typeof value !== 'string') {
        details.push(`'${field}' must be a string`);
      }

      if (rule.minLength !== undefined && strVal.length < rule.minLength) {
        details.push(`'${field}' must be at least ${rule.minLength} character(s)`);
      }

      if (rule.maxLength !== undefined && strVal.length > rule.maxLength) {
        details.push(`'${field}' must be at most ${rule.maxLength} character(s)`);
      }

      if (rule.enum && !rule.enum.includes(strVal)) {
        details.push(`'${field}' must be one of: ${rule.enum.join(', ')}`);
      }

      if (rule.contains && !strVal.includes(rule.contains)) {
        details.push(`'${field}' must contain '${rule.contains}'`);
      }
    }

    if (details.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details });
    }

    next();
  };
}

// --- Reusable rule sets ---

const taskRules = {
  title:    { required: true,  minLength: 1, maxLength: 255 },
  status:   { required: false, enum: STATUSES },
  priority: { required: false, enum: PRIORITIES },
};

const workspaceRules = {
  name: { required: true, minLength: 1, maxLength: 100 },
};

const listRules = {
  name: { required: true, minLength: 1, maxLength: 100 },
};

const commentRules = {
  content: { required: true, minLength: 1, maxLength: 5000 },
};

const authRules = {
  email:    { required: true, minLength: 1,  contains: '@' },
  password: { required: true, minLength: 6 },
  name:     { required: true, minLength: 2 },
};

module.exports = { validate, taskRules, workspaceRules, listRules, commentRules, authRules };
