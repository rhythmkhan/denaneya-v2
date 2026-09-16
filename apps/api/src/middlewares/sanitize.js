/**
 * DenaNeya v2.0 - Input Sanitization & Anti-Prototype Pollution Middleware
 * Prevents Stored XSS and Object Prototype Pollution (CWE-1321)
 */

import { sanitizeString } from '@denaneya/shared';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const URL_OR_RAW_KEYS = new Set(['webhook_url', 'redirect_url', 'url', 'raw_sms']);

/**
 * Recursively sanitizes strings and strips prototype-polluting keys.
 */
export function cleanDeep(value, key = null) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (key && URL_OR_RAW_KEYS.has(key)) {
      return value.trim();
    }
    return sanitizeString(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanDeep(item));
  }

  if (typeof value === 'object') {
    const cleaned = {};
    for (const [k, val] of Object.entries(value)) {
      if (!DANGEROUS_KEYS.has(k)) {
        cleaned[k] = cleanDeep(val, k);
      }
    }
    return cleaned;
  }

  return value;
}

export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanDeep(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanDeep(req.params);
  }
  next();
}

export default sanitizeInput;
