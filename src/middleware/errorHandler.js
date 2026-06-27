const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Global error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // PostgreSQL unique violation
  if (err.code === '23505') {
    const field = err.detail
      ? err.detail.match(/Key \((.+?)\)/)
      : null;
    const message = field
      ? `${field[1]} already exists`
      : 'Duplicate field value entered';
    error = new AppError(message, 409);
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    error = new AppError('Referenced resource not found', 404);
  }

  // PostgreSQL not null violation
  if (err.code === '23502') {
    const column = err.column || 'field';
    error = new AppError(`${column} is required`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  // Log server errors
  if (error.statusCode >= 500) {
    logger.error(err);
  }

  const response = {
    status: error.status || 'error',
    message: error.message || 'Internal server error',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
