const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Exception', err);

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    return errorResponse(res, 'Duplicate resource found', 'DUPLICATE_ERROR', 409);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return errorResponse(res, message, 'VALIDATION_ERROR', 400);
  }

  // Zod Validation Error (if we use Zod error directly)
  if (err.name === 'ZodError') {
    return errorResponse(res, err.errors.map(e => e.message).join(', '), 'VALIDATION_ERROR', 400);
  }

  return errorResponse(res, err.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR', 500);
};

module.exports = errorHandler;
