/**
 * DenaNeya v2.0 - Hosted Checkout Payment Reconciliation Controller
 * File: apps/api/src/controllers/paymentController.js
 *
 * Implements:
 * 1. POST /api/payment/submit-trx: Hosted checkout transaction submission
 * 2. POST /api/invoices/:id/verify: Parametrized verification alias
 * 3. GET /api/payment/status/:id: Lightweight short-polling status check
 *
 * Hardened against:
 * - VULN-03: Atomic CAS single-consumer guarantee
 * - VULN-06: Amount Oracle uniform constant-time error
 * - VULN-10: 15-Minute invoice TTL check (HTTP 410 INVOICE_EXPIRED)
 * - VULN-11: Atomic credit deduction inside transaction
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';
import { toPaisa } from '@denaneya/shared';
import { dispatchSingleWebhook } from '../services/webhookService.js';

const { getDatabase, getSystemSetting } = dbPkg;

// Universal helper: mask mobile numbers for privacy
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length < 7) return clean;
  return clean.slice(0, 3) + '****' + clean.slice(-4);
}

// Universal helper: parse UTC database datetime strings regardless of host timezone
function parseUtcDate(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  const s = String(dateStr).trim();
  if (s.endsWith('Z')) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(' ', 'T') + 'Z');
  }
  return new Date(s);
}

/**
 * Core Reconciliation Business Logic Function
 * Executes inside an ACID transaction with Atomic CAS.
 */
async function reconcileInvoicePayment({ invoiceId, trxId }) {
  const db = getDatabase();

  if (!invoiceId || typeof invoiceId !== 'string') {
    return { status: 400, body: { success: false, code: 'INVOICE_ID_REQUIRED', message: 'invoice_id is required.' } };
  }

  if (!trxId || typeof trxId !== 'string') {
    return { status: 400, body: { success: false, code: 'TRX_ID_REQUIRED', message: 'trx_id is required.' } };
  }

  const cleanInvoiceId = invoiceId.trim();
  const cleanTrx = trxId.trim().toUpperCase();

  // Basic regex format check (6-32 alphanumeric characters)
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(cleanTrx)) {
    return {
      status: 400,
      body: {
        success: false,
        code: 'TRANSACTION_INVALID',
        message: 'Transaction verification failed. Please check your TrxID and try again.'
      }
    };
  }

  return await db.transaction(async (tx) => {
    const now = new Date();
    const nowUtc = now.toISOString().replace('T', ' ').substring(0, 19);

    // 1. Fetch Invoice
    const invoice = await tx.get('SELECT * FROM invoices WHERE id = ?', [cleanInvoiceId]);
    if (!invoice) {
      return {
        status: 404,
        body: { success: false, code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' }
      };
    }

    // 2. Enforce 15-Minute Expiration Lifecycle (VULN-10 Defense)
    const expiresAt = parseUtcDate(invoice.expires_at);
    if (invoice.status === 'EXPIRED' || expiresAt.getTime() <= now.getTime()) {
      if (invoice.status === 'PENDING') {
        await tx.query(
          'UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?',
          ['EXPIRED', nowUtc, invoice.id]
        );
      }
      return {
        status: 410,
        body: {
          success: false,
          code: 'INVOICE_EXPIRED',
          message: 'This invoice has expired and can no longer accept payments.'
        }
      };
    }

    // 3. Status Validation
    if (invoice.status === 'PAID' || invoice.status === 'COMPLETED') {
      return {
        status: 400,
        body: {
          success: false,
          code: 'INVOICE_ALREADY_PAID',
          message: 'This invoice has already been paid.'
        }
      };
    }

    if (invoice.status !== 'PENDING') {
      return {
        status: 400,
        body: {
          success: false,
          code: 'INVOICE_INVALID_STATUS',
          message: `Invoice cannot be processed in current status: ${invoice.status}`
        }
      };
    }

    // 4. Fetch Brand & Merchant Credit Balance
    const brand = await tx.get(
      `SELECT b.id, b.user_id, b.brand_name, u.credits AS merchant_credits
       FROM brands b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [invoice.brand_id]
    );

    if (!brand) {
      return {
        status: 404,
        body: { success: false, code: 'BRAND_NOT_FOUND', message: 'Brand associated with invoice not found.' }
      };
    }

    if (Number(brand.merchant_credits) < 1) {
      return {
        status: 402,
        body: {
          success: false,
          code: 'INSUFFICIENT_CREDITS',
          message: 'Merchant credit balance is depleted. Please contact merchant support.'
        }
      };
    }

    // 5. ATOMIC COMPARE-AND-SWAP (CAS) on stored_data (VULN-03 & VULN-06 Defense)
    // Matches brand_id, UPPER(trx_id), status = 'UNUSED', and exact amount
    const invoiceAmount = Number(invoice.amount);
    const casResult = await tx.query(
      `UPDATE stored_data 
       SET status = 'USED', used_at = ? 
       WHERE brand_id = ? AND UPPER(trx_id) = ? AND status = 'UNUSED' AND amount = ?`,
      [nowUtc, invoice.brand_id, cleanTrx, invoiceAmount]
    );

    if (casResult.affectedRows === 0) {
      // Amount Oracle Defense: Uniform constant-time generic error
      return {
        status: 400,
        body: {
          success: false,
          code: 'TRANSACTION_INVALID',
          message: 'Transaction verification failed. Please check your TrxID and try again.'
        }
      };
    }

    // 6. Retrieve Matched Transaction Details for channel & sender
    const consumedTrx = await tx.get(
      'SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?',
      [invoice.brand_id, cleanTrx]
    );

    const paymentMethod = consumedTrx?.channel || invoice.payment_method || 'MFS';

    // 7. Transition Invoice to PAID
    await tx.query(
      `UPDATE invoices 
       SET status = 'PAID', trx_id = ?, payment_method = ?, updated_at = ? 
       WHERE id = ? AND brand_id = ?`,
      [cleanTrx, paymentMethod, nowUtc, invoice.id, invoice.brand_id]
    );

    // 8. Deduct 1 Merchant Credit Atomically (VULN-11 Defense)
    const creditResult = await tx.query(
      'UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1',
      [brand.user_id]
    );

    if (creditResult.affectedRows === 0) {
      // Concurrent exhaustion; abort transaction
      throw new Error('INSUFFICIENT_CREDITS');
    }

    // 9. Enqueue Webhook Event in webhook_logs
    const webhookId = `whk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    let parsedMetadata = null;
    if (invoice.metadata_json) {
      try {
        parsedMetadata = typeof invoice.metadata_json === 'string'
          ? JSON.parse(invoice.metadata_json)
          : invoice.metadata_json;
      } catch (_) {}
    }

    const webhookPayload = {
      event: 'invoice.completed',
      brand_id: invoice.brand_id,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoiceAmount,
      amount_paisa: toPaisa(invoiceAmount),
      currency: invoice.currency || 'BDT',
      trx_id: cleanTrx,
      payment_method: paymentMethod,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email,
      metadata: parsedMetadata,
      timestamp: Math.floor(Date.now() / 1000)
    };

    await tx.query(
      `INSERT INTO webhook_logs (
         id, brand_id, invoice_id, event, payload_json, status, attempts, created_at
       ) VALUES (?, ?, ?, 'invoice.completed', ?, 'PENDING', 0, ?)`,
      [webhookId, invoice.brand_id, invoice.id, JSON.stringify(webhookPayload), nowUtc]
    );

    // 10. Successful Reconciliation Response
    return {
      status: 200,
      webhookId,
      body: {
        success: true,
        message: 'Payment verified and invoice completed successfully.',
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: 'PAID',
        amount: invoiceAmount,
        currency: invoice.currency || 'BDT',
        trx_id: cleanTrx,
        payment_method: paymentMethod,
        redirect_url: invoice.redirect_url || null
      }
    };
  });
}

/**
 * POST /api/payment/submit-trx
 * Body: { invoice_id, trx_id, customer_phone? }
 */
export async function submitTrx(req, res) {
  try {
    const { invoice_id, invoiceId, trx_id, trxId, transactionId, paymentMethod, payment_method } = req.body || {};
    const targetInvoiceId = invoice_id || invoiceId;
    const targetTrxId = trx_id || trxId || transactionId;

    const targetMethod = (paymentMethod || payment_method || '').toLowerCase().trim();
    if (targetMethod) {
      const db = getDatabase();
      const masterSetting = await getSystemSetting(db, 'master_gateways', { disabled_channels: [] });
      const disabledChannels = (masterSetting.disabled_channels || masterSetting.disabledChannels || []).map((c) => String(c).toLowerCase());
      if (disabledChannels.includes(targetMethod)) {
        return res.status(400).json({
          success: false,
          code: 'GATEWAY_GLOBALLY_DISABLED',
          message: `Payment gateway channel '${targetMethod}' is temporarily disabled network-wide.`
        });
      }
    }

    const result = await reconcileInvoicePayment({
      invoiceId: targetInvoiceId,
      trxId: targetTrxId
    });

    if (result.status === 200 && result.webhookId) {
      dispatchSingleWebhook(result.webhookId).catch((err) => {
        console.error('[Webhook Dispatch Error]', err.message || err);
      });
    }

    return res.status(result.status).json(result.body);
  } catch (err) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        message: 'Merchant credit balance is depleted. Please contact merchant support.'
      });
    }
    console.error('[paymentController.submitTrx Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred during payment reconciliation.'
    });
  }
}

/**
 * POST /api/invoices/:id/verify
 * Params: { id }
 * Body: { trx_id }
 */
export async function verifyInvoice(req, res) {
  try {
    const invoiceId = req.params.id || req.body.invoice_id || req.body.invoiceId;
    const trxId = req.body.trx_id || req.body.trxId || req.body.transactionId;

    const result = await reconcileInvoicePayment({ invoiceId, trxId });

    if (result.status === 200 && result.webhookId) {
      dispatchSingleWebhook(result.webhookId).catch((err) => {
        console.error('[Webhook Dispatch Error]', err.message || err);
      });
    }

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[paymentController.verifyInvoice Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred during invoice verification.'
    });
  }
}

/**
 * GET /api/payment/status/:id (and /api/invoices/:id/status)
 * Lightweight polling endpoint for Hosted Checkout UI.
 */
export async function getInvoiceStatus(req, res) {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      return res.status(400).json({ success: false, code: 'INVOICE_ID_REQUIRED', message: 'Invoice ID is required.' });
    }

    const db = getDatabase();
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);

    if (!invoice) {
      return res.status(404).json({ success: false, code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    }

    const now = Date.now();
    const expiresAtMs = parseUtcDate(invoice.expires_at).getTime();
    const isExpired = invoice.status === 'EXPIRED' || (invoice.status === 'PENDING' && expiresAtMs <= now);

    // Auto-update to EXPIRED if past expiration window
    if (invoice.status === 'PENDING' && isExpired) {
      const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.query('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?', ['EXPIRED', nowUtc, invoice.id]);
      invoice.status = 'EXPIRED';
    }

    return res.status(200).json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      amount: Number(invoice.amount),
      currency: invoice.currency || 'BDT',
      trx_id: invoice.trx_id || null,
      payment_method: invoice.payment_method || null,
      expires_at: invoice.expires_at,
      is_expired: isExpired,
      redirect_url: invoice.redirect_url || null
    });
  } catch (err) {
    console.error('[paymentController.getInvoiceStatus Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve invoice status.'
    });
  }
}

export default {
  submitTrx,
  verifyInvoice,
  getInvoiceStatus
};
