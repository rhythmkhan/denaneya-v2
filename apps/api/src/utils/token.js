/**
 * DenaNeya v2.0 - Cryptographic Token Utilities
 * Issues and validates 24h JWT tokens with HS256 signing.
 */

import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

export function getSecret() {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

/**
 * Issue a signed JWT token valid for 24 hours.
 * @param {Object} payload - { id, email, role, credits }
 * @returns {string} Signed JWT token
 */
export function generateToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'merchant',
      credits: payload.credits !== undefined ? payload.credits : 50
    },
    getSecret(),
    {
      expiresIn: '24h',
      algorithm: 'HS256'
    }
  );
}

/**
 * Verify a JWT token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyToken(token) {
  return jwt.verify(token, getSecret(), {
    algorithms: ['HS256']
  });
}
