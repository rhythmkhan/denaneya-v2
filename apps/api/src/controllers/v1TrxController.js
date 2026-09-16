/**
 * DenaNeya v2.0 - Server-to-Server (S2S) 2-Step Transaction API Controller
 * File: apps/api/src/controllers/v1TrxController.js
 *
 * Implements:
 * 1. POST /v1/trx/verify: Step 1 - Check UNUSED transaction exists, deduct 1 credit, return verification
 * 2. POST /v1/trx/confirm: Step 2 - Commit transaction consumption (status = 'USED')
 *
 * Enforces:
 * - Constant-time generic rejection (VULN-06 Amount Oracle Defense)
 * - Atomic credit deduction (VULN-11 Defense)
 * - Atomic CAS confirmation (VULN-03 Double-Spend Defense)
 */

import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length < 7) return clean;
  return clean.slice(0, 3) + '****' + clean.slice(-4);
}

/**
 * POST /v1/trx/verify
 * Protected by: apiKeyAuth middleware
 * Body: { trx_id, amount, sms_ref? }
 */
export async function verifyTrx(req, res) {
  try {
    const brand = req.brand;
    const merchant = req.merchant;

    const { trx_id, trxId, transactionId, amount } = req.body || {};
    const targetTrxId = trx_id || trxId || transactionId;

    if (!targetTrxId || typeof targetTrxId !== 'string' || amount === undefined || amount === null) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        code: 'INVALID_PARAMETERS',
        message: 'Amount and transaction ID (trx_id) are required.'
      });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive numeric value.'
      });
    }

    // 1. Merchant Credit Pre-Check
    if (merchant.credits < 1) {
      return res.status(402).json({
        statusCode: 402,
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        message: 'Insufficient credits for transaction verification. Please recharge credits.'
      });
    }

    const cleanTrx = targetTrxId.trim().toUpperCase();
    const db = getDatabase();

    // 2. Query matching UNUSED transaction scoped strictly to this brand
    const stored = await db.get(
      `SELECT * FROM stored_data 
       WHERE brand_id = ? AND UPPER(trx_id) = ? AND status = 'UNUSED' AND amount = ?`,
      [brand.id, cleanTrx, numAmount]
    );

    if (!stored) {
      // Amount Oracle Defense: Uniform generic rejection
      return res.status(400).json({
        statusCode: 400,
        success: false,
        code: 'TRANSACTION_INVALID',
        message: 'Transaction verification failed. Please check your TrxID and try again.'
      });
    }

    // 3. Atomically Deduct 1 Credit (VULN-11 Defense)
    const creditResult = await db.query(
      'UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1',
      [brand.user_id]
    );

    if (creditResult.affectedRows === 0) {
      return res.status(402).json({
        statusCode: 402,
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        message: 'Insufficient credits for transaction verification. Please recharge credits.'
      });
    }

    // Update in-memory credit tracker
    req.merchant.credits -= 1;

    // 4. Return Verification Data (Transaction remains UNUSED until confirmed)
    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Transaction verified successfully.',
      data: {
        id: stored.id,
        trx_id: stored.trx_id,
        trxID: stored.trx_id,
        amount: Number(stored.amount),
        sender: maskPhone(stored.sender),
        channel: stored.channel,
        provider: stored.channel,
        status: 'UNUSED',
        received_at: stored.received_at,
        timestamp: stored.received_at
      }
    });
  } catch (err) {
    console.error('[v1TrxController.verifyTrx Error]', err.message || err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred during transaction verification.'
    });
  }
}

/**
 * POST /v1/trx/confirm
 * Protected by: apiKeyAuth middleware
 * Body: { id, trx_id }
 */
export async function confirmTrx(req, res) {
  try {
    const brand = req.brand;
    const { id, trx_id, trxId, transactionId } = req.body || {};
    const targetTrxId = trx_id || trxId || transactionId;

    if (!id || typeof id !== 'string' || !targetTrxId || typeof targetTrxId !== 'string') {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        code: 'INVALID_PARAMETERS',
        message: 'id (stored transaction UUID) and trx_id are required.'
      });
    }

    const cleanId = id.trim();
    const cleanTrx = targetTrxId.trim().toUpperCase();
    const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const db = getDatabase();

    // Atomic CAS Confirmation: Condition strictly on status = 'UNUSED'
    const casResult = await db.query(
      `UPDATE stored_data 
       SET status = 'USED', used_at = ? 
       WHERE id = ? AND brand_id = ? AND UPPER(trx_id) = ? AND status = 'UNUSED'`,
      [nowUtc, cleanId, brand.id, cleanTrx]
    );

    if (casResult.affectedRows === 0) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        code: 'TRANSACTION_ALREADY_USED',
        message: 'Transaction is already used or does not exist.'
      });
    }

    const updated = await db.get(
      'SELECT * FROM stored_data WHERE id = ? AND brand_id = ?',
      [cleanId, brand.id]
    );

    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Transaction confirmed and successfully consumed.',
      data: {
        id: updated.id,
        trx_id: updated.trx_id,
        transactionId: updated.trx_id,
        amount: Number(updated.amount),
        channel: updated.channel,
        provider: updated.channel,
        sender: maskPhone(updated.sender),
        senderNumber: maskPhone(updated.sender),
        status: 'USED',
        used_at: updated.used_at,
        timestamp: updated.received_at
      }
    });
  } catch (err) {
    console.error('[v1TrxController.confirmTrx Error]', err.message || err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred during transaction confirmation.'
    });
  }
}

export default {
  verifyTrx,
  confirmTrx
};
