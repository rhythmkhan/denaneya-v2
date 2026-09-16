/**
 * DenaNeya v2.0 - Webhook Controller & Interactive Test Dispatcher
 * File: apps/api/src/controllers/webhookController.js
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';
import {
  generateWebhookSignature,
  canonicalizeJson
} from '@denaneya/shared';
import {
  validateOutboundUrl,
  sendPinnedRequest
} from '../services/webhookService.js';

const { getDatabase } = dbPkg;

/**
 * POST /api/webhooks/test
 * Dispatches a simulated HMAC-SHA256 signed event (invoice.completed) to merchant listener URL.
 * Measures end-to-end latency in milliseconds and captures remote HTTP status & body.
 */
export async function testWebhookDispatch(req, res) {
  try {
    const targetUrl = (req.body?.webhook_url || req.brand?.webhook_url || '').trim();
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        code: 'WEBHOOK_URL_REQUIRED',
        message: 'Webhook URL is required. Please provide a URL or configure it in Brand Settings.'
      });
    }

    const db = getDatabase();
    let webhookSecret = req.brand?.webhook_secret;
    if (!webhookSecret && req.brand?.id) {
      const brandSecretRow = await db.get(
        'SELECT webhook_secret FROM brands WHERE id = ?',
        [req.brand.id]
      );
      webhookSecret = brandSecretRow?.webhook_secret;
    }
    if (!webhookSecret) {
      webhookSecret = 'whsec_live_' + crypto.randomBytes(24).toString('hex');
    }

    const nowTs = Math.floor(Date.now() / 1000);
    const nonce = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const simulatedPayload = {
      event: req.body?.event || 'invoice.completed',
      timestamp: nowTs,
      delivery_id: `whlog_test_${Math.random().toString(36).substring(2, 10)}`,
      data: {
        invoice_id: 'inv_test_simulated_99',
        invoice_number: 'INV-2026-TEST',
        amount: 1250.00,
        currency: 'BDT',
        status: 'COMPLETED',
        payment_method: 'bkash',
        trx_id: 'TEST_TRX_889900',
        customer_name: 'Test Customer',
        customer_phone: '01712345678',
        completed_at: new Date().toISOString()
      }
    };

    const sigOutput = generateWebhookSignature(simulatedPayload, webhookSecret, nowTs, nonce);
    // Strict production SSRF hardening: allowHttpForTesting is strictly gated on non-production environments
    const allowHttpForTesting = process.env.NODE_ENV !== 'production';

    const validation = await validateOutboundUrl(targetUrl, { allowHttpForTesting });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_WEBHOOK_URL',
        message: `SSRF or URL validation failed: ${validation.error}`,
        signature_header: sigOutput.header,
        sent_payload: simulatedPayload
      });
    }

    const startTime = Date.now();
    let httpStatus = 0;
    let responseBody = '';

    try {
      const resp = await sendPinnedRequest(validation.normalizedUrl, {
        pinnedAddress: validation.pinnedAddress,
        ipFamily: validation.ipFamily,
        body: canonicalizeJson(simulatedPayload),
        headers: {
          'X-DenaNeya-Signature': sigOutput.header,
          'X-DenaNeya-Timestamp': String(nowTs),
          'X-DenaNeya-Nonce': nonce,
          'X-DenaNeya-Event': simulatedPayload.event,
          'x-zinipay-signature': sigOutput.signature,
          'x-zinipay-timestamp': String(nowTs),
          'x-zinipay-nonce': nonce
        },
        timeoutMs: 5000
      });
      httpStatus = resp.status;
      responseBody = resp.body || '';
    } catch (dispatchErr) {
      responseBody = dispatchErr.message || 'Connection failed';
    }

    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      http_status: httpStatus,
      status_text: httpStatus >= 200 && httpStatus < 300 ? 'OK' : (httpStatus ? 'HTTP Error' : 'Connection Failed'),
      latency_ms: latencyMs,
      signature_header: sigOutput.header,
      signature: sigOutput.signature,
      sent_payload: simulatedPayload,
      response_body: typeof responseBody === 'string' ? responseBody.slice(0, 1000) : JSON.stringify(responseBody).slice(0, 1000),
      target_url: targetUrl
    });
  } catch (err) {
    console.error('[testWebhookDispatch Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Failed to dispatch test webhook'
    });
  }
}
