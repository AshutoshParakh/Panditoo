const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, _req, res, _next) => {
  const requestedStatus = Number(err.status || err.statusCode);
  const statusCode = res.statusCode && res.statusCode !== 200
    ? res.statusCode
    : requestedStatus >= 400 && requestedStatus < 600 ? requestedStatus : 500;

  console.error("Error handler caught:", err);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
