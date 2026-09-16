/**
 * DenaNeya v2.0 - Server-to-Server (S2S) Payment / Invoice API Controller
 * File: apps/api/src/controllers/v1PaymentController.js
 *
 * Implements:
 * 1. POST /v1/payment/create: S2S Invoice Creation with 15-minute TTL for WooCommerce & external merchants
 * 2. POST /v1/payment/verify: S2S Invoice Status Verification
 *
 * Guarded by: apiKeyAuth middleware (X-API-KEY and X-API-SECRET)
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.trim();
  if (clean.length < 7) return clean;
  return clean.slice(0, 3) + '****' + clean.slice(-4);
}

/**
 * POST /v1/payment/create
 * Creates a pending invoice for WooCommerce checkout redirect.
 */
export async function createPaymentInvoice(req, res) {
  try {
    const brand = req.brand;
    const merchant = req.merchant;

    const {
      amount,
      currency = 'BDT',
      order_id,
      customer_name,
      cus_name,
      customer_email,
      cus_email,
      customer_phone,
      cus_phone,
      redirect_url,
      cancel_url,
      webhook_url,
      metadata
    } = req.body || {};

    // 1. Amount Validation
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        status: false,
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive numeric value greater than 0.'
      });
    }

    if (parsedAmount > 500000) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        status: false,
        code: 'AMOUNT_EXCEEDS_LIMIT',
        message: 'Invoice amount exceeds maximum transaction limit of 500,000 BDT.'
      });
    }

    // 2. Merchant Credit Pre-Check
    if (merchant.credits < 1) {
      return res.status(402).json({
        statusCode: 402,
        success: false,
        status: false,
        code: 'INSUFFICIENT_CREDITS',
        message: 'Merchant credit balance is depleted. Please top up your credits to generate new invoices.'
      });
    }

    // 3. Customer Information Parsing
    const rawCustomerName = (customer_name || cus_name || '').trim();
    const resolvedCustomerName = rawCustomerName || (order_id ? `Customer #${order_id}` : 'Guest Customer');
    const resolvedCustomerEmail = (customer_email || cus_email || '').trim() || null;
    const resolvedCustomerPhone = (customer_phone || cus_phone || '').trim() || null;

    // 4. Metadata Compilation
    let metaObj = {};
    if (metadata) {
      if (typeof metadata === 'object') {
        metaObj = { ...metadata };
      } else if (typeof metadata === 'string') {
        try {
          metaObj = JSON.parse(metadata);
        } catch (_) {
          metaObj = { raw: metadata };
        }
      }
    }

    if (order_id && !metaObj.order_id) {
      metaObj.order_id = String(order_id);
    }
    if (cancel_url && !metaObj.cancel_url) {
      metaObj.cancel_url = String(cancel_url);
    }
    if (webhook_url && !metaObj.webhook_url) {
      metaObj.webhook_url = String(webhook_url);
    }

    // 5. Generate Unique Identifiers & 15-Minute Expiration Window
    const invoiceId = `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${randomSuffix}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute TTL
    const nowUtc = now.toISOString().replace('T', ' ').substring(0, 19);
    const expiresUtc = expiresAt.toISOString().replace('T', ' ').substring(0, 19);

    const serializedMetadata = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;

    // 6. Insert Invoice into Database
    const db = getDatabase();
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, customer_name, customer_email, customer_phone,
         amount, currency, status, payment_method, redirect_url, metadata_json,
         expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        brand.id,
        invoiceNumber,
        resolvedCustomerName,
        resolvedCustomerEmail,
        resolvedCustomerPhone,
        parsedAmount,
        currency.toUpperCase(),
        redirect_url ? redirect_url.trim() : null,
        serializedMetadata,
        expiresUtc,
        nowUtc,
        nowUtc
      ]
    );

    // 7. Construct Hosted Checkout URL
    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol || 'http';
    const publicCheckoutBase =
      process.env.CHECKOUT_BASE_URL ||
      process.env.FRONTEND_URL ||
      `${protocol}://${host}`;
    const checkoutUrl = `${publicCheckoutBase.replace(/\/$/, '')}/pay/${invoiceId}`;

    return res.status(201).json({
      statusCode: 201,
      success: true,
      status: true,
      message: 'Invoice created successfully with 15-minute TTL.',
      invoice_id: invoiceId,
      checkout_url: checkoutUrl,
      payment_url: checkoutUrl,
      expires_at: expiresUtc,
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        brand_id: brand.id,
        brand_name: brand.brand_name,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        customer_name: resolvedCustomerName,
        customer_phone: resolvedCustomerPhone ? maskPhone(resolvedCustomerPhone) : null,
        customer_email: resolvedCustomerEmail,
        checkout_url: checkoutUrl,
        payment_url: checkoutUrl,
        redirect_url: redirect_url || null,
        expires_at: expiresUtc,
        created_at: nowUtc,
        metadata: metaObj
      }
    });
  } catch (err) {
    console.error('[v1PaymentController.createPaymentInvoice Error]', err.message || err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      status: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create payment invoice.'
    });
  }
}

/**
 * POST /v1/payment/verify
 * Verifies the payment status of an invoice.
 */
export async function verifyPaymentInvoice(req, res) {
  try {
    const brand = req.brand;
    const { invoice_id, invoiceId } = req.body || {};
    const targetId = (invoice_id || invoiceId || '').trim();

    if (!targetId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        status: false,
        code: 'INVOICE_ID_REQUIRED',
        message: 'Invoice ID is required for verification.'
      });
    }

    const db = getDatabase();
    const invoice = await db.get(
      'SELECT * FROM invoices WHERE id = ? AND brand_id = ?',
      [targetId, brand.id]
    );

    if (!invoice) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        status: false,
        code: 'INVOICE_NOT_FOUND',
        message: 'Invoice not found.'
      });
    }

    return res.status(200).json({
      statusCode: 200,
      success: true,
      status: true,
      invoice_id: invoice.id,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      payment_status: invoice.status,
      payment_method: invoice.payment_method,
      trx_id: invoice.trx_id,
      expires_at: invoice.expires_at,
      created_at: invoice.created_at
    });
  } catch (err) {
    console.error('[v1PaymentController.verifyPaymentInvoice Error]', err.message || err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      status: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify payment invoice.'
    });
  }
}

export default {
  createPaymentInvoice,
  verifyPaymentInvoice
};
