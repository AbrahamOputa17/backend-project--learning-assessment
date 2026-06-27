const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Sign a JWT token.
 * @param {object} payload - Data to encode
 * @returns {string} Signed JWT
 */
const signToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Verify a JWT token.
 * @param {string} token - JWT string
 * @returns {object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

module.exports = { signToken, verifyToken };
