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

module.exports = { protect };
