const { errorResponse } = require('../utils/response');

const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return errorResponse(res, message, 'VALIDATION_ERROR', 400);
  }
};

module.exports = validateRequest;
