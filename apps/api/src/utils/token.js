/**
 * DenaNeya v2.0 - Cryptographic Token Utilities
 * Issues and validates 24h JWT tokens and 5m pre-authentication tokens with HS256 signing.
 */

import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

export function getSecret() {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

/**
 * Issue a signed JWT token valid for 24 hours.
 * @param {Object} payload - { id, email, role, credits, ... }
 * @returns {string} Signed JWT token
 */
export function generateToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'merchant',
      credits: payload.credits !== undefined ? payload.credits : 50,
      ...(payload.twoFactorVerified ? { twoFactorVerified: true } : {}),
      ...(payload.twoFactorPending ? { twoFactorPending: true } : {})
    },
    getSecret(),
    {
      expiresIn: '24h',
      algorithm: 'HS256'
    }
  );
}

/**
 * Issue a short-lived 5-minute pre-authentication JWT token for 2FA challenge.
 * @param {Object} payload - { id, email, role }
 * @returns {string}
 */
export function generatePreAuthToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'superadmin',
      isPreAuth: true
    },
    getSecret(),
    {
      expiresIn: '5m',
      algorithm: 'HS256'
    }
  );
}

/**
 * Verify a pre-auth token or challenged authentication token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyPreAuthToken(token) {
  const decoded = verifyToken(token);
  return decoded;
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
