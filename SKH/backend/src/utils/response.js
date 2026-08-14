const successResponse = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message, code, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
