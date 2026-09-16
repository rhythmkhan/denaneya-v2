/**
 * DenaNeya v2.0 - Comprehensive Invoices & Hosted Checkout Controller
 * File: apps/api/src/controllers/invoiceController.js
 *
 * Implements:
 * 1. GET  /api/invoices/:id/public   - Public Zero-Secret Invoice & Gateways Summary
 * 2. GET  /pay/:invoiceId           - Standalone Hosted Checkout UI / Redirect
 * 3. POST /api/invoices             - Authenticated Merchant Invoice Creation (15-min TTL)
 * 4. GET  /api/invoices             - Authenticated Tenant-Scoped Invoices Listing
 * 5. GET  /api/invoices/:id         - Authenticated Single Invoice Inspection
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Universal helper: mask mobile numbers for privacy (e.g., 01712345678 -> 017****5678)
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
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
 * 1. GET /api/invoices/:id/public
 * Opaque Public Endpoint for Hosted Checkout UI
 * Zero-Secret Projection: Omits api_secret, webhook_secret, user_id, device_tokens
 */
export async function getPublicInvoice(req, res) {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId || typeof invoiceId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVOICE_ID_REQUIRED',
        message: 'Invoice ID is required.'
      });
    }

    const db = getDatabase();
    const cleanId = invoiceId.trim();

    // 1. Fetch Invoice
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [cleanId]);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: 'INVOICE_NOT_FOUND',
        message: 'The requested invoice does not exist or has been removed.'
      });
    }

    // 2. Enforce 15-Minute TTL Expiration
    const now = Date.now();
    const expiresAtMs = parseUtcDate(invoice.expires_at).getTime();
    const isExpired = invoice.status === 'EXPIRED' || (invoice.status === 'PENDING' && expiresAtMs <= now);

    if (invoice.status === 'PENDING' && isExpired) {
      const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.query(
        'UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?',
        ['EXPIRED', nowUtc, invoice.id]
      );
      invoice.status = 'EXPIRED';
    }

    const timeRemainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

    // 3. Fetch Brand Info (Zero Secrets)
    const brand = await db.get(
      'SELECT id, brand_name, brand_slug FROM brands WHERE id = ?',
      [invoice.brand_id]
    );

    // 4. Fetch Active Configured Gateways for Brand
    const gatewaysQuery = await db.query(
      `SELECT id, channel_name, category, account_type, account_number, routing_number,
              branch_name, district, ussd_code, fee_percentage, fee_fixed, exchange_rate, fields_json
       FROM gateways
       WHERE brand_id = ? AND status = 'active'
       ORDER BY category ASC, channel_name ASC`,
      [invoice.brand_id]
    );

    const activeGateways = (gatewaysQuery.rows || []).map((gw) => {
      let parsedFields = null;
      if (gw.fields_json) {
        try {
          parsedFields = typeof gw.fields_json === 'string' ? JSON.parse(gw.fields_json) : gw.fields_json;
        } catch (_) {}
      }
      return {
        id: gw.id,
        channel_name: gw.channel_name,
        category: gw.category,
        account_type: gw.account_type,
        account_number: gw.account_number,
        routing_number: gw.routing_number,
        branch_name: gw.branch_name,
        district: gw.district,
        ussd_code: gw.ussd_code,
        fee_percentage: Number(gw.fee_percentage || 0),
        fee_fixed: Number(gw.fee_fixed || 0),
        exchange_rate: Number(gw.exchange_rate || 1),
        fields: parsedFields
      };
    });

    return res.status(200).json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        brand_id: invoice.brand_id,
        brand_name: brand?.brand_name || 'DenaNeya Merchant',
        brand_slug: brand?.brand_slug || '',
        customer_name: invoice.customer_name,
        customer_phone: maskPhone(invoice.customer_phone),
        customer_email: invoice.customer_email || null,
        amount: Number(invoice.amount),
        currency: invoice.currency || 'BDT',
        status: invoice.status,
        payment_method: invoice.payment_method || null,
        trx_id: invoice.status === 'PAID' ? invoice.trx_id : null,
        redirect_url: invoice.redirect_url || null,
        expires_at: invoice.expires_at,
        time_remaining_seconds: isExpired ? 0 : timeRemainingSeconds,
        is_expired: isExpired
      },
      gateways: activeGateways
    });
  } catch (err) {
    console.error('[invoiceController.getPublicInvoice Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve public invoice details.'
    });
  }
}

/**
 * 2. GET /pay/:invoiceId
 * Serves Hosted Checkout HTML or Redirects to Frontend
 */
export async function renderHostedCheckout(req, res) {
  try {
    const invoiceId = req.params.invoiceId;
    if (!invoiceId) {
      return res.status(400).send('<h3>Invalid or Missing Invoice ID</h3>');
    }

    const db = getDatabase();
    const invoice = await db.get('SELECT id, status FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(`<!DOCTYPE html>
<html>
<head><title>Invoice Not Found - DenaNeya</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;box-sizing:border-box}.card{background:#fff;border-radius:1.5rem;padding:2.5rem;max-width:28rem;width:100%;text-align:center;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);border:1px solid #e2e8f0}.icon{width:3.5rem;height:3.5rem;background:#fef2f2;color:#dc2626;border-radius:1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.75rem;font-weight:bold}h1{font-size:1.35rem;margin:0 0 0.5rem;color:#0f172a}p{font-size:0.875rem;color:#64748b;margin:0 0 1.5rem;line-height:1.5}</style></head>
<body><div class="card"><div class="icon">!</div><h1>Invoice Not Found</h1><p>The requested invoice does not exist or the payment link is invalid.</p></div><!-- /api/invoices/${invoiceId}/public --></body>
</html>`);
    }

    // Check if separate frontend hosted checkout URL is configured (e.g. Next.js web app)
    const frontendUrl = process.env.HOSTED_CHECKOUT_FRONTEND_URL || process.env.FRONTEND_URL;
    if (frontendUrl && !req.query.standalone) {
      return res.redirect(302, `${frontendUrl.replace(/\/$/, '')}/pay/${encodeURIComponent(invoiceId)}`);
    }

    // Otherwise serve high-performance standalone fallback checkout HTML
    const templatePath = path.resolve(__dirname, '../views/checkout_template.html');
    if (fs.existsSync(templatePath)) {
      let html = fs.readFileSync(templatePath, 'utf8');
      html = html.replace('<div class="container">', `<div class="container" data-invoice-id="${invoiceId}"><!-- Invoice: ${invoiceId} -->`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // Fallback inline template if file view is missing
    const fallbackHtml = `<!DOCTYPE html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>দেনা নেয়া - পেমেন্ট চেকআউট</title>
<style>body{font-family:sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{background:#fff;padding:24px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);max-width:400px;width:90%;text-align:center}
h2{color:#0f172a;margin-top:0}a{color:#059669;text-decoration:none;font-weight:bold}</style></head>
<body><div class="box"><h2>DenaNeya Secure Checkout</h2><p>Invoice: <b>${invoiceId}</b></p>
<p>Loading payment channels...</p>
<script>location.replace('/api/invoices/${invoiceId}/public');</script>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  } catch (err) {
    console.error('[invoiceController.renderHostedCheckout Error]', err.message || err);
    return res.status(500).send('<h3>Unable to load checkout page. Please contact merchant support.</h3>');
  }
}

/**
 * 3. POST /api/invoices
 * Authenticated Merchant Invoice Creation with 15-min TTL
 * Requires authMiddleware + tenantMiddleware
 */
export async function createInvoice(req, res) {
  try {
    const {
      amount,
      customer_name,
      customer_email,
      customer_phone,
      currency = 'BDT',
      redirect_url,
      payment_method,
      metadata
    } = req.body || {};

    const brandId = req.brand.id;
    const userId = req.user.id;

    // 1. Validation
    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number greater than 0.'
      });
    }

    if (parsedAmount > 500000) {
      return res.status(400).json({
        success: false,
        code: 'AMOUNT_EXCEEDS_LIMIT',
        message: 'Invoice amount exceeds maximum transaction limit of 500,000 BDT.'
      });
    }

    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CUSTOMER_NAME',
        message: 'customer_name is required (minimum 2 characters).'
      });
    }

    // 2. Check Merchant Credit Balance
    const db = getDatabase();
    const targetUserId = req.brand?.user_id || userId;
    const merchant = await db.get('SELECT credits FROM users WHERE id = ?', [targetUserId]);
    if (!merchant || Number(merchant.credits) < 1) {
      return res.status(402).json({
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        message: 'Merchant credit balance is depleted. Please top up your credits to generate new invoices.'
      });
    }

    // 3. Generate Unique Identifiers & 15-Minute Expiration Window
    const invoiceId = `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${randomSuffix}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-min TTL
    const nowUtc = now.toISOString().replace('T', ' ').substring(0, 19);
    const expiresUtc = expiresAt.toISOString().replace('T', ' ').substring(0, 19);

    const serializedMetadata = metadata ? JSON.stringify(metadata) : null;

    // 4. Insert Invoice into Database
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, customer_name, customer_email, customer_phone,
         amount, currency, status, payment_method, redirect_url, metadata_json,
         expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        brandId,
        invoiceNumber,
        customer_name.trim(),
        customer_email ? customer_email.trim() : null,
        customer_phone ? customer_phone.trim() : null,
        parsedAmount,
        currency.toUpperCase(),
        payment_method || null,
        redirect_url ? redirect_url.trim() : null,
        serializedMetadata,
        expiresUtc,
        nowUtc,
        nowUtc
      ]
    );

    // 5. Construct Checkout URL
    const publicCheckoutBase = process.env.CHECKOUT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkoutUrl = `${publicCheckoutBase.replace(/\/$/, '')}/pay/${invoiceId}`;

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully with 15-minute TTL.',
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        brand_id: brandId,
        brand_name: req.brand.brand_name,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        customer_name: customer_name.trim(),
        customer_phone: customer_phone ? maskPhone(customer_phone) : null,
        customer_email: customer_email || null,
        expires_at: expiresUtc,
        checkout_url: checkoutUrl,
        redirect_url: redirect_url || null,
        created_at: nowUtc
      }
    });
  } catch (err) {
    console.error('[invoiceController.createInvoice Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create invoice.'
    });
  }
}

/**
 * 4. GET /api/invoices
 * List Merchant Invoices (Tenant-Scoped & Paginated)
 */
export async function listInvoices(req, res) {
  try {
    const brandId = req.brand.id;
    const { status, search, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const db = getDatabase();
    const whereClauses = ['brand_id = ?'];
    const params = [brandId];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status.toUpperCase());
    }

    if (search) {
      whereClauses.push('(invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR trx_id LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total Count
    const countResult = await db.get(`SELECT COUNT(*) AS total FROM invoices WHERE ${whereSql}`, params);
    const total = countResult?.total || 0;

    // Fetch Invoices
    const querySql = `
      SELECT id, brand_id, invoice_number, customer_name, customer_email, customer_phone,
             amount, currency, status, payment_method, trx_id, redirect_url, expires_at, created_at, updated_at
      FROM invoices
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const invoicesResult = await db.query(querySql, params);

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(total / limitNum)
      },
      invoices: invoicesResult.rows || []
    });
  } catch (err) {
    console.error('[invoiceController.listInvoices Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve invoices list.'
    });
  }
}

/**
 * 5. GET /api/invoices/:id
 * Detailed Merchant Invoice Inspection
 */
export async function getInvoiceById(req, res) {
  try {
    const brandId = req.brand.id;
    const invoiceId = req.params.id;

    const db = getDatabase();
    const invoice = await db.get(
      'SELECT * FROM invoices WHERE id = ? AND brand_id = ?',
      [invoiceId, brandId]
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: 'INVOICE_NOT_FOUND',
        message: 'Invoice not found in this brand.'
      });
    }

    // Fetch associated webhook logs
    const webhookLogs = await db.query(
      'SELECT id, event, status, attempts, response_status, created_at FROM webhook_logs WHERE invoice_id = ? ORDER BY created_at DESC',
      [invoiceId]
    );

    let parsedMetadata = null;
    if (invoice.metadata_json) {
      try {
        parsedMetadata = typeof invoice.metadata_json === 'string' ? JSON.parse(invoice.metadata_json) : invoice.metadata_json;
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      invoice: {
        ...invoice,
        amount: Number(invoice.amount),
        metadata: parsedMetadata,
        webhooks: webhookLogs.rows || []
      }
    });
  } catch (err) {
    console.error('[invoiceController.getInvoiceById Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve invoice details.'
    });
  }
}

export default {
  getPublicInvoice,
  renderHostedCheckout,
  createInvoice,
  listInvoices,
  getInvoiceById
};
