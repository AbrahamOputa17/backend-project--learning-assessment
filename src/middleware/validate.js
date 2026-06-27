const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Run express-validator checks and return 400 if any fail.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(new AppError(messages.join('. '), 400));
  }
  next();
};

module.exports = validate;
