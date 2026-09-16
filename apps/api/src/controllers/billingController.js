/**
 * DenaNeya v2.0 - Billing & Credits Controller
 * File: apps/api/src/controllers/billingController.js
 *
 * Implements:
 * 1. GET  /api/billing/balance - Live credit balance, starter credits, usage history
 * 2. POST /api/billing/topup   - Top up credits package with instant balance credit
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

// Standard Top-up Packages Catalog
export const TOPUP_PACKAGES = [
  { id: 'pkg_starter_50', name: 'Starter Pack', credits: 50, price_bdt: 50, discount_pct: 0 },
  { id: 'pkg_growth_200', name: 'Growth Pack', credits: 200, price_bdt: 180, discount_pct: 10 },
  { id: 'pkg_business_500', name: 'Business Pack', credits: 500, price_bdt: 425, discount_pct: 15 },
  { id: 'pkg_enterprise_2000', name: 'Enterprise Pack', credits: 2000, price_bdt: 1500, discount_pct: 25 }
];

/**
 * 1. GET /api/billing/balance
 * Live Credit Balance & Usage History
 */
export async function getBalance(req, res) {
  try {
    const targetUserId = (!req.isBrandOwner && req.brand?.user_id) ? req.brand.user_id : req.user.id;
    const brandId = req.brand.id;
    const db = getDatabase();

    // 1. Fetch User Balance
    const user = await db.get('SELECT id, name, email, credits FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account not found.'
      });
    }

    // 2. Fetch Brand Invoicing Analytics
    const invoiceStats = await db.get(
      `SELECT COUNT(*) AS total_paid, COALESCE(SUM(amount), 0) AS total_volume
       FROM invoices
       WHERE brand_id = ? AND status = 'PAID'`,
      [brandId]
    );

    // 3. Fetch Recent Credit Deductions (Last 10 Paid Invoices)
    const recentDeductions = await db.query(
      `SELECT id AS invoice_id, invoice_number, amount, currency, trx_id, payment_method, updated_at AS deducted_at
       FROM invoices
       WHERE brand_id = ? AND status = 'PAID'
       ORDER BY updated_at DESC
       LIMIT 10`,
      [brandId]
    );

    return res.status(200).json({
      success: true,
      balance: {
        credits: Number(user.credits || 0),
        starter_credits: 50,
        rate_per_verification_bdt: 1.0,
        rolling_expiration_days: 30,
        total_paid_invoices: Number(invoiceStats?.total_paid || 0),
        total_volume_bdt: Number(invoiceStats?.total_volume || 0),
        recent_deductions: (recentDeductions.rows || []).map((d) => ({
          ...d,
          credits_deducted: 1,
          amount: Number(d.amount)
        }))
      },
      packages: TOPUP_PACKAGES
    });
  } catch (err) {
    console.error('[billingController.getBalance Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve billing balance.'
    });
  }
}

/**
 * 2. POST /api/billing/topup
 * Purchase & Top-up Credits
 */
export async function topupCredits(req, res) {
  try {
    if (!req.isBrandOwner) {
      return res.status(403).json({
        success: false,
        code: 'OWNER_ONLY',
        message: 'Only the brand owner can purchase credits.'
      });
    }

    const userId = req.user.id;
    const { amount_credits, package_id, payment_method = 'bKash' } = req.body || {};

    let creditsToAdd = 0;
    let priceBdt = 0;

    if (package_id) {
      const pkg = TOPUP_PACKAGES.find((p) => p.id === package_id);
      if (!pkg) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PACKAGE',
          message: `Package '${package_id}' is not recognized.`
        });
      }
      creditsToAdd = pkg.credits;
      priceBdt = pkg.price_bdt;
    } else {
      creditsToAdd = parseInt(amount_credits, 10);
      if (!creditsToAdd || isNaN(creditsToAdd) || creditsToAdd < 10) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_CREDIT_AMOUNT',
          message: 'Minimum credit top-up is 10 credits.'
        });
      }
      priceBdt = creditsToAdd * 1.0;
    }

    const db = getDatabase();

    // Atomic Balance Increment
    await db.query(
      'UPDATE users SET credits = credits + ? WHERE id = ?',
      [creditsToAdd, userId]
    );

    const updatedUser = await db.get('SELECT credits FROM users WHERE id = ?', [userId]);
    const topupRef = `topup_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

    return res.status(200).json({
      success: true,
      message: `Successfully added ${creditsToAdd} credits to your balance.`,
      topup: {
        ref_id: topupRef,
        credits_added: creditsToAdd,
        new_balance: Number(updatedUser?.credits || 0),
        price_bdt: priceBdt,
        payment_method,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[billingController.topupCredits Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process credit topup.'
    });
  }
}

export default {
  getBalance,
  topupCredits,
  TOPUP_PACKAGES
};
