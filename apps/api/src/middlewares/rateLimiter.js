/**
 * DenaNeya v2.0 - Rate Limiting Architecture
 * Tiered throttling to defend against brute force, DDoS, and Amount Oracle probing.
 */

import rateLimit from 'express-rate-limit';

// Standard rate limit exceeded JSON formatter
function createRateLimitHandler(message, code = 'RATE_LIMIT_EXCEEDED') {
  return (req, res) => {
    res.status(429).json({
      success: false,
      code,
      message
    });
  };
}

/**
 * 1. Global API Rate Limiter
 * 300 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests from this IP. Please try again later.', 'GLOBAL_RATE_LIMIT_EXCEEDED')
});

/**
 * 2. Authentication Rate Limiter
 * Applied to POST /api/auth/register and POST /api/auth/login.
 * Defends against credential stuffing and registration flood.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === 'test' ? 100 : 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again in 15 minutes.', 'AUTH_RATE_LIMIT_EXCEEDED')
});

/**
 * 3. Payment / Transaction Submission Rate Limiter
 * Applied to POST /api/payment/submit-trx.
 * 5 attempts per 1 minute per IP. Defends against TrxID brute force and Amount Oracle probing.
 */
export const trxSubmitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many verification attempts. Please wait 1 minute before retrying.', 'TRX_RATE_LIMIT_EXCEEDED')
});
export const trxSubmissionLimiter = trxSubmitLimiter;

/**
 * 4. Device SMS Sync Rate Limiter
 * Applied to POST /api/device/sync-sms.
 * 120 requests per minute per IP.
 */
export const deviceSyncLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Device sync rate limit exceeded. Please back off.', 'SYNC_RATE_LIMIT_EXCEEDED')
});
