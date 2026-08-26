const { errorResponse } = require('../utils/response');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 'Not authorized, no token', 'UNAUTHORIZED', 401);
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded; // just mock user
    next();
  } catch (error) {
    return errorResponse(res, 'Not authorized, token failed', 'UNAUTHORIZED', 401);
  }
};

/**
 * Restricts a route to the given JWT roles.
 * Must be mounted after `protect`, which populates req.user from the token.
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return errorResponse(res, 'Not authorized for this resource', 'FORBIDDEN', 403);
  }
  next();
};

module.exports = { protect, requireRole };
