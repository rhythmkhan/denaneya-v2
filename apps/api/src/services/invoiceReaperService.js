/**
 * DenaNeya v2.0 - 15-Minute Invoice TTL Background Reaper Daemon
 * File: apps/api/src/services/invoiceReaperService.js
 *
 * Responsibilities:
 * 1. Queries stale invoices in 'PENDING' status where expires_at < CURRENT_TIMESTAMP.
 * 2. Executes atomic CAS transition from 'PENDING' to 'EXPIRED'.
 * 3. Enqueues 'invoice.expired' event in webhook_logs for merchant inventory release.
 * 4. Supports periodic execution (unref timer) and clean shutdown.
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';
import { toPaisa } from '@denaneya/shared';

const { getDatabase } = dbPkg;

/**
 * Sweeps the invoices table and marks expired pending invoices.
 * @param {Object} [databaseInstance]
 * @returns {Promise<{ expiredCount: number }>}
 */
export async function expirePendingInvoices(databaseInstance) {
  const db = databaseInstance || getDatabase();
  const now = new Date();
  const nowUtc = now.toISOString().replace('T', ' ').substring(0, 19);

  try {
    // 1. Fetch pending invoices past expiration
    const result = await db.query(
      `SELECT id, brand_id, invoice_number, amount, currency,
              customer_name, customer_phone, customer_email, metadata_json
       FROM invoices 
       WHERE status = 'PENDING' AND expires_at < ?`,
      [nowUtc]
    );

    const expiredRows = result.rows || [];
    if (expiredRows.length === 0) {
      return { expiredCount: 0 };
    }

    let expiredCount = 0;

    for (const inv of expiredRows) {
      try {
        await db.transaction(async (tx) => {
          // Atomic CAS status transition
          const updateRes = await tx.query(
            `UPDATE invoices 
             SET status = 'EXPIRED', updated_at = ? 
             WHERE id = ? AND status = 'PENDING'`,
            [nowUtc, inv.id]
          );

          if (updateRes.affectedRows > 0) {
            expiredCount++;

            // Enqueue invoice.expired event in webhook_logs
            const webhookId = `whk_exp_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
            const invAmount = Number(inv.amount);
            
            let parsedMetadata = null;
            if (inv.metadata_json) {
              try {
                parsedMetadata = typeof inv.metadata_json === 'string'
                  ? JSON.parse(inv.metadata_json)
                  : inv.metadata_json;
              } catch (_) {}
            }

            const payload = {
              event: 'invoice.expired',
              brand_id: inv.brand_id,
              invoice_id: inv.id,
              invoice_number: inv.invoice_number,
              amount: invAmount,
              amount_paisa: toPaisa(invAmount),
              currency: inv.currency || 'BDT',
              status: 'EXPIRED',
              customer_name: inv.customer_name,
              customer_phone: inv.customer_phone,
              customer_email: inv.customer_email,
              metadata: parsedMetadata,
              timestamp: Math.floor(now.getTime() / 1000)
            };

            await tx.query(
              `INSERT INTO webhook_logs (
                 id, brand_id, invoice_id, event, payload_json, status, attempts, created_at
               ) VALUES (?, ?, ?, 'invoice.expired', ?, 'PENDING', 0, ?)`,
              [webhookId, inv.brand_id, inv.id, JSON.stringify(payload), nowUtc]
            );
          }
        });
      } catch (err) {
        console.error(`[TTL Reaper] Failed to expire invoice ${inv.id}:`, err.message);
      }
    }

    if (expiredCount > 0) {
      console.log(`[TTL Reaper] Auto-expired ${expiredCount} pending invoice(s) past TTL window.`);
    }

    return { expiredCount };
  } catch (err) {
    console.error('[TTL Reaper Sweep Error]', err.message || err);
    return { expiredCount: 0 };
  }
}

/**
 * Starts the invoice reaper background daemon.
 * @param {Object} [databaseInstance]
 * @param {number} [intervalMs=60000] Default 60 seconds
 * @returns {{ stop: Function }}
 */
export function startInvoiceReaper(databaseInstance, intervalMs = 60000) {
  const db = databaseInstance || getDatabase();
  console.log(`[TTL Reaper] Initialized background daemon (interval: ${intervalMs}ms).`);

  // Initial sweep immediately on startup
  expirePendingInvoices(db).catch(() => {});

  const intervalId = setInterval(() => {
    expirePendingInvoices(db).catch((err) => {
      console.error('[TTL Reaper Interval Error]', err.message);
    });
  }, intervalMs);

  // Prevent background timer from keeping Node process alive unnecessarily
  intervalId.unref();

  return {
    stop() {
      clearInterval(intervalId);
      console.log('[TTL Reaper] Background daemon stopped.');
    }
  };
}

export default {
  expirePendingInvoices,
  startInvoiceReaper
};
