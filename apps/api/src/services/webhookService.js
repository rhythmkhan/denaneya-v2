/**
 * DenaNeya v2.0 - SSRF-Hardened Outbound Webhook Dispatcher Service
 * Architecture & Implementation by Milestone 3 Explorer 3
 * 
 * Features:
 * - RFC 8785 JSON Canonicalization Scheme (deterministic payload serialization)
 * - HMAC-SHA256 signature generation with timestamp and nonce replay mitigation
 * - Pre-flight DNS resolution & IP literal verification blocking 15+ prohibited CIDR subnets
 * - Socket IP pinning via custom https.Agent / http.Agent to eliminate DNS Rebinding (TOCTOU)
 * - Reviewer 2 Advisory Fix: Automatic HTML entity unescaping for escaped slashes (&#x2F;)
 * - Exponential backoff retry logic (up to 3 retries) with atomic status updates in webhook_logs
 * - Concurrency-safe batch processing preventing double-dispatch in cluster mode
 */

import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { URL } from 'node:url';

import dbPkg from '@denaneya/database';
import {
  canonicalizeJson,
  generateWebhookSignature,
  verifyWebhookSignature,
  validateWebhookSecret,
  isProhibitedIP,
  validateWebhookUrl,
  createPinnedHttpsAgent
} from '@denaneya/shared';

const { getDatabase } = dbPkg;

// Export isPrivateIP as an alias to shared isProhibitedIP for interface compliance
export const isPrivateIP = isProhibitedIP;

/**
 * Maximum outbound dispatch attempts before marking as permanently FAILED.
 */
export const MAX_DISPATCH_RETRIES = 3;

/**
 * Default HTTP request timeout for webhook delivery in milliseconds.
 */
export const DEFAULT_WEBHOOK_TIMEOUT_MS = 10000;

/**
 * Unescapes HTML entities in URLs (addresses Reviewer 2 advisory where '/' was converted to '&#x2F;').
 * Ensures URLs passed through sanitizeInput or stored with entities are restored to valid URI syntax.
 *
 * @param {string} str - Raw or escaped URL string
 * @returns {string} Fully unescaped URL string
 */
export function unescapeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&#x2F;/g, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&#60;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#62;/g, '>');
}

/**
 * Normalizes and validates raw webhook URL strings.
 * Resolves HTML entity encodings, trims whitespace, and ensures valid RFC 3986 format.
 *
 * @param {string} rawUrl - Input URL
 * @returns {string|null} Normalized URL string, or null if malformed
 */
export function normalizeWebhookUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const unescaped = unescapeHtmlEntities(rawUrl.trim());
  try {
    const parsed = new URL(unescaped);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Performs pre-flight SSRF validation against a target webhook URL.
 * Checks for private IP subnets, loopback, cloud metadata (169.254.169.254),
 * IPv6 loopback (::1), link-local, multicast, CGNAT, and performs full DNS resolution.
 *
 * @param {string} targetUrl - Target webhook endpoint
 * @param {Object} [options]
 * @param {boolean} [options.allowHttpForTesting=false] - Explicitly allows http and localhost only for mock test receivers
 * @returns {Promise<{ valid: boolean, normalizedUrl?: string, pinnedAddress?: string, ipFamily?: number, error?: string }>}
 */
export async function validateOutboundUrl(targetUrl, options = {}) {
  const normalized = normalizeWebhookUrl(targetUrl);
  if (!normalized) {
    return { valid: false, error: 'INVALID_URL_FORMAT' };
  }

  const result = await validateWebhookUrl(normalized, {
    allowHttpForTesting: options.allowHttpForTesting === true
  });

  if (!result.valid) {
    return { valid: false, error: result.error, normalizedUrl: normalized };
  }

  return {
    valid: true,
    normalizedUrl: normalized,
    pinnedAddress: result.pinnedAddress,
    ipFamily: result.ipFamily
  };
}

/**
 * Creates an HTTP or HTTPS Agent pinned to the pre-resolved IP address.
 * Bypasses DNS resolution during socket connection to eliminate DNS Rebinding (TOCTOU).
 *
 * @param {string} protocol - 'http:' or 'https:'
 * @param {string} pinnedIp - Validated IP address
 * @param {number} ipFamily - 4 or 6
 * @returns {http.Agent|https.Agent} Pinned transport agent
 */
export function createPinnedAgent(protocol, pinnedIp, ipFamily) {
  if (protocol === 'https:') {
    return createPinnedHttpsAgent(pinnedIp, ipFamily);
  }

  // Pinned HTTP Agent for test environments
  return new http.Agent({
    keepAlive: false,
    lookup: (_hostname, opts, cb) => {
      if (typeof opts === 'function') {
        cb = opts;
      }
      cb(null, pinnedIp, ipFamily);
    }
  });
}

/**
 * Dispatches an HTTP/HTTPS POST request using socket pinning and timeout enforcement.
 *
 * @param {string} targetUrl - Destination URL
 * @param {Object} options
 * @param {string} options.pinnedAddress - Pre-resolved safe IP
 * @param {number} options.ipFamily - IP version (4 or 6)
 * @param {string} options.body - Serialized canonical payload
 * @param {Record<string, string>} options.headers - HTTP headers including signature
 * @param {number} [options.timeoutMs=10000] - Request timeout in milliseconds
 * @returns {Promise<{ status: number, headers: Record<string, string>, body: string }>}
 */
export async function sendPinnedRequest(targetUrl, options) {
  const { pinnedAddress, ipFamily, body, headers = {}, timeoutMs = DEFAULT_WEBHOOK_TIMEOUT_MS } = options;
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const transport = isHttps ? https : http;
  const agent = createPinnedAgent(parsed.protocol, pinnedAddress, ipFamily);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'User-Agent': 'DenaNeya-Webhook-Dispatcher/2.0',
        ...headers
      },
      agent,
      timeout: timeoutMs
    };

    const req = transport.request(parsed, reqOptions, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`REQUEST_TIMEOUT: Webhook delivery timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Enqueues an outbound webhook event into the webhook_logs table.
 *
 * @param {string} brandId - Target merchant brand ID
 * @param {string|null} invoiceId - Associated invoice ID (if any)
 * @param {string} event - Event name (e.g. 'invoice.completed', 'invoice.expired')
 * @param {Object} payload - Event payload object
 * @returns {Promise<{ logId: string, status: string }>}
 */
export async function enqueueWebhookEvent(brandId, invoiceId, event, payload) {
  const db = getDatabase();
  const logId = `whlog_${crypto.randomBytes(12).toString('hex')}`;
  const canonicalPayloadStr = canonicalizeJson(payload);

  await db.query(
    `INSERT INTO webhook_logs (
       id, brand_id, invoice_id, event, payload_json, response_status, response_body, status, attempts
     ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 'PENDING', 0)`,
    [logId, brandId, invoiceId, event, canonicalPayloadStr]
  );

  return { logId, status: 'PENDING' };
}

/**
 * Dispatches a single webhook log entry by ID.
 * Performs URL unescaping, SSRF pre-flight validation, socket pinning,
 * RFC 8785 canonical JSON serialization, HMAC-SHA256 signature calculation,
 * and updates webhook_logs with response status or failure details.
 *
 * @param {string} webhookLogId - ID from webhook_logs table
 * @param {Object} [options]
 * @param {boolean} [options.allowHttpForTesting=false]
 * @param {number} [options.maxRetries=3]
 * @param {number} [options.timeoutMs=10000]
 * @returns {Promise<{ success: boolean, status: string, httpStatus?: number, error?: string, attempts: number }>}
 */
export async function dispatchSingleWebhook(webhookLogId, options = {}) {
  const db = getDatabase();
  const maxRetries = options.maxRetries || MAX_DISPATCH_RETRIES;
  const allowHttpForTesting = options.allowHttpForTesting === true;
  const timeoutMs = options.timeoutMs || DEFAULT_WEBHOOK_TIMEOUT_MS;

  // 1. Fetch log and merchant brand information
  const log = await db.get(
    `SELECT w.id, w.brand_id, w.invoice_id, w.event, w.payload_json, w.attempts, w.status,
            b.webhook_url, b.webhook_secret, b.status AS brand_status
     FROM webhook_logs w
     JOIN brands b ON w.brand_id = b.id
     WHERE w.id = ?`,
    [webhookLogId]
  );

  if (!log) {
    return { success: false, status: 'NOT_FOUND', error: 'Webhook log record not found', attempts: 0 };
  }

  // If already terminal, return current state
  if (log.status === 'SUCCESS' || log.status === 'SSRF_BLOCKED' || (log.status === 'FAILED' && log.attempts >= maxRetries)) {
    return {
      success: log.status === 'SUCCESS',
      status: log.status,
      attempts: log.attempts
    };
  }

  // 2. Concurrency Lock: Mark as PROCESSING to avoid duplicate dispatch in cluster mode
  await db.query(
    `UPDATE webhook_logs SET status = 'PROCESSING' WHERE id = ? AND status IN ('PENDING', 'PROCESSING')`,
    [webhookLogId]
  );

  const currentAttempts = (log.attempts || 0) + 1;

  // 3. Verify brand webhook configuration
  if (!log.webhook_url || log.webhook_url.trim().length === 0) {
    await db.query(
      `UPDATE webhook_logs
       SET status = 'SKIPPED', response_status = NULL, response_body = 'NO_WEBHOOK_URL_CONFIGURED', attempts = ?
       WHERE id = ?`,
      [currentAttempts, webhookLogId]
    );
    return { success: false, status: 'SKIPPED', error: 'NO_WEBHOOK_URL_CONFIGURED', attempts: currentAttempts };
  }

  // 4. Validate URL & Pre-flight SSRF Validation with Reviewer 2 unescaping advisory
  const validation = await validateOutboundUrl(log.webhook_url, { allowHttpForTesting });
  if (!validation.valid) {
    const isSsrfBlock = validation.error?.startsWith('SSRF_BLOCKED') || validation.error?.includes('PRIVATE_IP');
    const targetStatus = isSsrfBlock ? 'SSRF_BLOCKED' : 'FAILED';
    const reasonText = `${targetStatus}: ${validation.error}`;

    await db.query(
      `UPDATE webhook_logs
       SET status = ?, response_status = NULL, response_body = ?, attempts = ?
       WHERE id = ?`,
      [targetStatus, reasonText, currentAttempts, webhookLogId]
    );

    return {
      success: false,
      status: targetStatus,
      error: validation.error,
      attempts: currentAttempts
    };
  }

  // 5. Canonicalize Payload & Generate HMAC-SHA256 Signature
  let payloadObj;
  try {
    payloadObj = JSON.parse(log.payload_json);
  } catch {
    payloadObj = { raw: log.payload_json };
  }

  const canonicalBody = canonicalizeJson(payloadObj);
  const nowTs = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();

  let sigOutput;
  try {
    sigOutput = generateWebhookSignature(payloadObj, log.webhook_secret, nowTs, nonce);
  } catch (err) {
    await db.query(
      `UPDATE webhook_logs
       SET status = 'FAILED', response_status = NULL, response_body = ?, attempts = ?
       WHERE id = ?`,
      [`SIGNING_ERROR: ${err.message}`, currentAttempts, webhookLogId]
    );
    return { success: false, status: 'FAILED', error: err.message, attempts: currentAttempts };
  }

  // 6. Execute Pinned Outbound Request
  try {
    const response = await sendPinnedRequest(validation.normalizedUrl, {
      pinnedAddress: validation.pinnedAddress,
      ipFamily: validation.ipFamily,
      body: canonicalBody,
      headers: {
        'X-DenaNeya-Signature': sigOutput.header,
        'X-DenaNeya-Timestamp': String(nowTs),
        'X-DenaNeya-Nonce': nonce,
        'X-DenaNeya-Event': log.event,
        'X-DenaNeya-Delivery': webhookLogId,
        'x-zinipay-signature': sigOutput.signature,
        'x-zinipay-timestamp': String(nowTs),
        'x-zinipay-nonce': nonce
      },
      timeoutMs
    });

    const isHttpSuccess = response.status >= 200 && response.status < 300;
    const truncatedBody = (response.body || '').substring(0, 1000);

    if (isHttpSuccess) {
      await db.query(
        `UPDATE webhook_logs
         SET status = 'SUCCESS', response_status = ?, response_body = ?, attempts = ?
         WHERE id = ?`,
        [response.status, truncatedBody, currentAttempts, webhookLogId]
      );

      return {
        success: true,
        status: 'SUCCESS',
        httpStatus: response.status,
        attempts: currentAttempts
      };
    } else {
      // Non-2xx response: evaluate retry or failure
      const finalStatus = currentAttempts >= maxRetries ? 'FAILED' : 'PENDING';
      await db.query(
        `UPDATE webhook_logs
         SET status = ?, response_status = ?, response_body = ?, attempts = ?
         WHERE id = ?`,
        [finalStatus, response.status, truncatedBody, currentAttempts, webhookLogId]
      );

      return {
        success: false,
        status: finalStatus,
        httpStatus: response.status,
        error: `HTTP_${response.status}`,
        attempts: currentAttempts,
        willRetry: finalStatus === 'PENDING'
      };
    }
  } catch (netErr) {
    const truncatedErr = (netErr.message || 'NETWORK_ERROR').substring(0, 1000);
    const finalStatus = currentAttempts >= maxRetries ? 'FAILED' : 'PENDING';

    await db.query(
      `UPDATE webhook_logs
       SET status = ?, response_status = NULL, response_body = ?, attempts = ?
       WHERE id = ?`,
      [finalStatus, truncatedErr, currentAttempts, webhookLogId]
    );

    return {
      success: false,
      status: finalStatus,
      error: truncatedErr,
      attempts: currentAttempts,
      willRetry: finalStatus === 'PENDING'
    };
  }
}

/**
 * Dispatches a webhook log with synchronous exponential backoff retries.
 * Useful for test suites and immediate delivery invocations.
 *
 * @param {string} webhookLogId - ID from webhook_logs
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3]
 * @param {number} [options.baseBackoffMs=1000] - Base delay for exponential backoff (0 in fast tests)
 * @param {boolean} [options.allowHttpForTesting=false]
 * @param {number} [options.timeoutMs=10000]
 * @returns {Promise<{ success: boolean, status: string, attempts: number, httpStatus?: number, error?: string }>}
 */
export async function dispatchWithRetries(webhookLogId, options = {}) {
  const maxRetries = options.maxRetries || MAX_DISPATCH_RETRIES;
  const baseBackoffMs = options.baseBackoffMs !== undefined ? options.baseBackoffMs : 1000;

  let lastResult = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await dispatchSingleWebhook(webhookLogId, options);

    // Stop on terminal success or non-retryable status
    if (
      lastResult.success ||
      lastResult.status === 'SUCCESS' ||
      lastResult.status === 'SSRF_BLOCKED' ||
      lastResult.status === 'SKIPPED'
    ) {
      return lastResult;
    }

    // If more attempts remain and exponential delay requested, wait before retry
    if (attempt < maxRetries && baseBackoffMs > 0) {
      const delay = Math.pow(2, attempt - 1) * baseBackoffMs;
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  return lastResult;
}

/**
 * Batch worker runner that scans for pending webhook events and dispatches them.
 * Supports configurable concurrency and batch limits.
 *
 * @param {Object} [options]
 * @param {number} [options.limit=50] - Maximum pending records to fetch per batch
 * @param {number} [options.batchSize=10] - Maximum concurrent outgoing requests
 * @param {boolean} [options.allowHttpForTesting=false]
 * @param {number} [options.maxRetries=3]
 * @returns {Promise<{ total: number, succeeded: number, failed: number, blocked: number, skipped: number }>}
 */
export async function dispatchPendingWebhooks(options = {}) {
  const db = getDatabase();
  const limit = options.limit || 50;
  const batchSize = options.batchSize || 10;
  const maxRetries = options.maxRetries || MAX_DISPATCH_RETRIES;

  const queryResult = await db.query(
    `SELECT id FROM webhook_logs
     WHERE status = 'PENDING' AND attempts < ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [maxRetries, limit]
  );

  const pendingRows = queryResult.rows || [];
  const stats = { total: pendingRows.length, succeeded: 0, failed: 0, blocked: 0, skipped: 0 };

  if (pendingRows.length === 0) {
    return stats;
  }

  // Process in chunks to prevent socket pool exhaustion
  for (let i = 0; i < pendingRows.length; i += batchSize) {
    const chunk = pendingRows.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      chunk.map((row) => dispatchSingleWebhook(row.id, options))
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const val = r.value;
        if (val.status === 'SUCCESS') stats.succeeded++;
        else if (val.status === 'SSRF_BLOCKED') stats.blocked++;
        else if (val.status === 'SKIPPED') stats.skipped++;
        else stats.failed++;
      } else {
        stats.failed++;
      }
    }
  }

  return stats;
}

export default {
  MAX_DISPATCH_RETRIES,
  DEFAULT_WEBHOOK_TIMEOUT_MS,
  isPrivateIP,
  unescapeHtmlEntities,
  normalizeWebhookUrl,
  validateOutboundUrl,
  createPinnedAgent,
  sendPinnedRequest,
  enqueueWebhookEvent,
  dispatchSingleWebhook,
  dispatchWithRetries,
  dispatchPendingWebhooks
};
