/**
 * DenaNeya v2.0 - Device Controller
 * File: apps/api/src/controllers/deviceController.js
 *
 * Implements:
 * 1. Carrier SMS Ingestion (POST /api/device/sync-sms):
 *    - BTRC Telecom Sender Whitelist validation via @denaneya/shared (bKash, 16216, Nagad, 16222, Upay).
 *    - Debit keyword blacklist filtering (Cash Out, Send Money, Payment to, Debit, Fee Tk [1-9]).
 *    - Zero false positives on authentic 'Fee Tk 0.00' and 'Charge Tk 0.00' receipts.
 *    - MFS regex parsing extracting trx_id, amount (paisa minor units via toPaisa), customer_mobile.
 *    - Idempotent insertion into stored_data scoped to (brand_id, device_id).
 *    - Graceful handling of UNIQUE(brand_id, trx_id) collision (idempotent deduplication).
 * 2. Device Heartbeat & Status (POST /api/device/heartbeat, POST /api/device/ping):
 *    - Updates battery_level, last_sync_at, and marks status = 'active'.
 * 3. Merchant Device Pairing & Management (REST /api/devices):
 *    - Register new hardware, generate pairing QR data, rotate device tokens, and list active handsets.
 */

import crypto from 'crypto';
import dbPkg from '@denaneya/database';
import {
  isTelecomSenderWhitelisted,
  checkDebitBlacklist,
  parseIncomingSms,
  toPaisa
} from '@denaneya/shared';

const { getDatabase } = dbPkg;

/**
 * Normalizes HTML-encoded characters that may have been escaped
 * by global input sanitization middleware before running regex parsers.
 */
function unescapeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&#x2F;/g, '/')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Checks if a database error corresponds to a UNIQUE constraint collision.
 * Dual-driver portable: supports better-sqlite3 and mysql2.
 */
function isUniqueConstraintError(err) {
  if (!err) return false;
  return (
    err.code === 'ER_DUP_ENTRY' ||
    err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    (typeof err.message === 'string' &&
      (err.message.includes('UNIQUE constraint failed') ||
        err.message.includes('Duplicate entry')))
  );
}

/**
 * Masks a device token showing only prefix and last 4 characters.
 */
function maskDeviceToken(token) {
  if (!token || typeof token !== 'string') return null;
  const last4 = token.slice(-4);
  return `tok_dev_••••••••••••••••••••••••${last4}`;
}

// ==============================================================================
// 1. CARRIER SMS INGESTION ENGINE
// ==============================================================================

/**
 * POST /api/device/sync-sms
 * Ingests, validates, parses, and idempotently buffers carrier SMS receipts.
 * Protected by deviceAuthMiddleware (req.device and req.brandId attached).
 */
export async function syncSMS(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brandId;
    const device = req.device;

    // Support both single SMS payload and batch multi-SMS array
    const { message, text, body, sender, address, from, sim_slot, timestamp, messages } = req.body || {};

    const rawList = Array.isArray(messages)
      ? messages
      : message || text || body
      ? [{
          message: message || text || body,
          sender: sender || address || from,
          sim_slot: sim_slot ?? 1,
          timestamp: timestamp || new Date().toISOString()
        }]
      : [];

    if (rawList.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'EMPTY_PAYLOAD',
        message: 'No SMS messages provided in request payload.'
      });
    }

    const isSingle = !Array.isArray(messages) && rawList.length === 1;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let ingestedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    const processedResults = [];

    for (const item of rawList) {
      const rawSender = (item.sender || item.address || item.from || '').toString().trim();
      const rawMsg = unescapeHtmlEntities((item.message || item.text || item.body || '').toString().trim());
      const simSlot = Number(item.sim_slot) === 2 ? 2 : 1;
      const receivedAt = item.timestamp
        ? new Date(item.timestamp).toISOString().replace('T', ' ').substring(0, 19)
        : nowIso;

      // --- STEP 1: BTRC TELECOM SENDER WHITELIST VALIDATION (VULN-02 Mitigation) ---
      if (!isTelecomSenderWhitelisted(rawSender)) {
        skippedCount++;
        const errorDetail = {
          success: false,
          code: 'UNAUTHORIZED_SENDER',
          sender: rawSender,
          message: `Originating sender '${rawSender}' is not an authorized telecom mask (bKash, 16216, Nagad, 16222, Upay). Dropped.`
        };

        if (isSingle) {
          return res.status(400).json(errorDetail);
        }
        processedResults.push(errorDetail);
        continue;
      }

      // --- STEP 2: DEBIT KEYWORD BLACKLIST CHECK (VULN-05 Mitigation) ---
      const debitCheck = checkDebitBlacklist(rawMsg);
      if (debitCheck.isDebit) {
        skippedCount++;
        const errorDetail = {
          success: false,
          code: 'DEBIT_TRANSACTION_REJECTED',
          sender: rawSender,
          pattern: debitCheck.matchedPattern,
          message: `Message rejected: detected debit or cash-out event (${debitCheck.matchedPattern}).`
        };

        if (isSingle) {
          return res.status(400).json(errorDetail);
        }
        processedResults.push(errorDetail);
        continue;
      }

      // --- STEP 3: MFS REGEX PARSING PIPELINE ---
      const parseResult = parseIncomingSms(rawSender, rawMsg);
      if (!parseResult.success || !parseResult.data) {
        skippedCount++;
        const errorDetail = {
          success: false,
          code: parseResult.error || 'SMS_PARSE_FAILED',
          sender: rawSender,
          message: parseResult.message || 'Failed directional credit extraction.'
        };

        if (isSingle) {
          return res.status(422).json(errorDetail);
        }
        processedResults.push(errorDetail);
        continue;
      }

      const parsed = parseResult.data;
      const canonicalTrxId = parsed.trxId.toUpperCase().trim();
      const amountFloat = Number(parsed.amount);
      const amountPaisa = toPaisa(amountFloat);

      // --- STEP 4: IDEMPOTENT INSERTION INTO stored_data (VULN-09 & VULN-12 Mitigation) ---
      const storedId = `sms_${crypto.randomBytes(12).toString('hex')}`;

      try {
        await db.query(
          `INSERT INTO stored_data (
             id, brand_id, device_id, sender, raw_sms, channel,
             trx_id, amount, status, sim_slot, received_at, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNUSED', ?, ?, ?)`,
          [
            storedId,
            brandId,
            device.id,
            rawSender,
            rawMsg,
            parsed.provider,
            canonicalTrxId,
            amountFloat,
            simSlot,
            receivedAt,
            nowIso
          ]
        );

        ingestedCount++;
        const successDetail = {
          success: true,
          ingested: 1,
          stored_id: storedId,
          trx_id: canonicalTrxId,
          amount: amountFloat,
          amount_paisa: amountPaisa,
          provider: parsed.provider,
          customer_mobile: parsed.senderNumber,
          sms_ref: parsed.smsRef || null,
          sim_slot: simSlot,
          status: 'UNUSED'
        };

        if (isSingle) {
          // Update device sync timestamp and status on single success
          await db.query(
            `UPDATE devices SET last_sync_at = ?, status = 'active' WHERE id = ?`,
            [nowIso, device.id]
          );
          return res.status(201).json(successDetail);
        }
        processedResults.push(successDetail);
      } catch (insertErr) {
        // --- STEP 5: GRACEFUL UNIQUE(brand_id, trx_id) COLLISION HANDLING ---
        if (isUniqueConstraintError(insertErr)) {
          duplicateCount++;

          // Fetch existing record to provide idempotent verification response
          const existing = await db.get(
            `SELECT id, trx_id, amount, status, channel, received_at 
             FROM stored_data 
             WHERE brand_id = ? AND trx_id = ?`,
            [brandId, canonicalTrxId]
          );

          const duplicateDetail = {
            success: true,
            ingested: 0,
            duplicate: true,
            trx_id: canonicalTrxId,
            amount: existing ? Number(existing.amount) : amountFloat,
            amount_paisa: existing ? toPaisa(Number(existing.amount)) : amountPaisa,
            status: existing ? existing.status : 'UNUSED',
            message: 'Transaction ID already recorded for this brand.'
          };

          if (isSingle) {
            // Keep device status refreshed even on duplicate delivery
            await db.query(
              `UPDATE devices SET last_sync_at = ?, status = 'active' WHERE id = ?`,
              [nowIso, device.id]
            );
            return res.status(200).json(duplicateDetail);
          }
          processedResults.push(duplicateDetail);
        } else {
          console.error('[syncSMS Database Insertion Error]', insertErr);
          if (isSingle) {
            return res.status(500).json({
              success: false,
              code: 'DATABASE_ERROR',
              message: 'Failed to record transaction receipt.'
            });
          }
          skippedCount++;
          processedResults.push({
            success: false,
            code: 'DATABASE_ERROR',
            trx_id: canonicalTrxId,
            message: insertErr.message
          });
        }
      }
    }

    // Update handset liveness status
    await db.query(
      `UPDATE devices SET last_sync_at = ?, status = 'active' WHERE id = ?`,
      [nowIso, device.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Batch SMS sync processed.',
      total_received: rawList.length,
      ingested: ingestedCount,
      duplicates: duplicateCount,
      skipped: skippedCount,
      transactions: processedResults
    });
  } catch (err) {
    console.error('[syncSMS Fatal Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process carrier SMS sync.'
    });
  }
}

// ==============================================================================
// 2. DEVICE HEARTBEAT & HARDWARE TELEMETRY
// ==============================================================================

/**
 * POST /api/device/heartbeat
 * Periodic hardware telemetry ping from Android handset background worker.
 * Updates battery level, operator connectivity, and sets status = 'active'.
 * Protected by deviceAuthMiddleware.
 */
export async function deviceHeartbeat(req, res) {
  try {
    const db = getDatabase();
    const deviceId = req.device.id;
    const { battery_level, sim1_operator, sim2_operator } = req.body || {};

    let battery = req.device.battery_level;
    if (battery_level !== undefined && battery_level !== null) {
      const parsedBattery = parseInt(battery_level, 10);
      if (isNaN(parsedBattery) || parsedBattery < 0 || parsedBattery > 100) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_BATTERY_LEVEL',
          message: 'Battery level must be an integer between 0 and 100.'
        });
      }
      battery = parsedBattery;
    }

    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.query(
      `UPDATE devices 
       SET battery_level = ?,
           sim1_operator = COALESCE(?, sim1_operator),
           sim2_operator = COALESCE(?, sim2_operator),
           last_sync_at = ?,
           status = 'active'
       WHERE id = ?`,
      [
        battery,
        sim1_operator ? String(sim1_operator).trim().slice(0, 50) : null,
        sim2_operator ? String(sim2_operator).trim().slice(0, 50) : null,
        nowIso,
        deviceId
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Device heartbeat acknowledged.',
      device: {
        id: deviceId,
        device_name: req.device.device_name,
        battery_level: battery,
        status: 'active',
        last_sync_at: nowIso
      }
    });
  } catch (err) {
    console.error('[deviceHeartbeat Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to record device heartbeat.'
    });
  }
}

/**
 * GET /api/device/status (or /api/device/me)
 * Device self-verification endpoint for initial connection testing.
 * Protected by deviceAuthMiddleware.
 */
export async function getDeviceSelfStatus(req, res) {
  return res.status(200).json({
    success: true,
    device: {
      id: req.device.id,
      brand_id: req.device.brand_id,
      device_name: req.device.device_name,
      device_model: req.device.device_model,
      sim1_operator: req.device.sim1_operator,
      sim2_operator: req.device.sim2_operator,
      battery_level: req.device.battery_level,
      status: req.device.status,
      last_sync_at: req.device.last_sync_at
    },
    brand: {
      id: req.brand.id,
      brand_name: req.brand.brand_name,
      brand_slug: req.brand.brand_slug
    }
  });
}

// ==============================================================================
// 3. MERCHANT DEVICE MANAGEMENT & PAIRING (DASHBOARD API)
// ==============================================================================

/**
 * GET /api/devices
 * Lists all devices paired under the merchant's active brand.
 * Protected by authMiddleware + tenantMiddleware.
 */
export async function listDevices(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brand.id;

    const result = await db.query(
      `SELECT 
         id, brand_id, device_name, device_model, device_token,
         sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at
       FROM devices
       WHERE brand_id = ?
       ORDER BY created_at DESC`,
      [brandId]
    );

    const devices = (result.rows || []).map((dev) => {
      // Calculate dynamic liveness: if last_sync_at was within 10 minutes, handset is online
      const lastSyncTime = dev.last_sync_at ? new Date(dev.last_sync_at).getTime() : 0;
      const isOnline = Date.now() - lastSyncTime < 10 * 60 * 1000 && dev.status === 'active';

      return {
        id: dev.id,
        brand_id: dev.brand_id,
        device_name: dev.device_name,
        device_model: dev.device_model,
        device_token_masked: maskDeviceToken(dev.device_token),
        sim1_operator: dev.sim1_operator,
        sim2_operator: dev.sim2_operator,
        battery_level: Number(dev.battery_level),
        last_sync_at: dev.last_sync_at,
        status: isOnline ? 'active' : dev.status === 'deactivated' ? 'deactivated' : 'offline',
        created_at: dev.created_at
      };
    });

    return res.status(200).json({
      success: true,
      devices
    });
  } catch (err) {
    console.error('[listDevices Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve devices.'
    });
  }
}

/**
 * POST /api/devices
 * Pairs a new Android device under the merchant's active brand.
 * Generates cryptographic device_token and pairing payload for QR code.
 * Protected by authMiddleware + tenantMiddleware.
 */
export async function createDevice(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brand.id;
    const { device_name, device_model, sim1_operator, sim2_operator } = req.body || {};

    const cleanName = (device_name || '').toString().trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Device name is required (2 to 100 characters).'
      });
    }

    const deviceId = `dev_${crypto.randomBytes(12).toString('hex')}`;
    const deviceToken = `tok_dev_${crypto.randomBytes(24).toString('hex')}`;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.query(
      `INSERT INTO devices (
         id, brand_id, device_name, device_model, device_token,
         sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 100, NULL, 'offline', ?)`,
      [
        deviceId,
        brandId,
        cleanName,
        device_model ? String(device_model).trim().slice(0, 100) : null,
        deviceToken,
        sim1_operator ? String(sim1_operator).trim().slice(0, 50) : null,
        sim2_operator ? String(sim2_operator).trim().slice(0, 50) : null,
        nowIso
      ]
    );

    // Payload for instant Android camera QR pairing scan
    const pairingPayload = {
      version: '2.0',
      brand_id: brandId,
      brand_name: req.brand.brand_name,
      device_id: deviceId,
      device_token: deviceToken,
      sync_endpoint: '/api/device/sync-sms',
      heartbeat_endpoint: '/api/device/heartbeat'
    };

    return res.status(201).json({
      success: true,
      message: 'Device created successfully. Scan QR code or copy device token to your Android handset.',
      device: {
        id: deviceId,
        brand_id: brandId,
        device_name: cleanName,
        device_model: device_model || null,
        device_token: deviceToken, // Plaintext disclosed ONLY ONCE upon creation
        sim1_operator: sim1_operator || null,
        sim2_operator: sim2_operator || null,
        battery_level: 100,
        status: 'offline',
        created_at: nowIso
      },
      pairing_qr_data: JSON.stringify(pairingPayload)
    });
  } catch (err) {
    console.error('[createDevice Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create and pair device.'
    });
  }
}

/**
 * GET /api/devices/:id
 * Fetches single device details.
 * Protected by authMiddleware + tenantMiddleware.
 */
export async function getDeviceById(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brand.id;
    const deviceId = req.params.id;

    const device = await db.get(
      `SELECT 
         id, brand_id, device_name, device_model, device_token,
         sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at
       FROM devices
       WHERE id = ? AND brand_id = ?`,
      [deviceId, brandId]
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found.'
      });
    }

    return res.status(200).json({
      success: true,
      device: {
        id: device.id,
        brand_id: device.brand_id,
        device_name: device.device_name,
        device_model: device.device_model,
        device_token_masked: maskDeviceToken(device.device_token),
        sim1_operator: device.sim1_operator,
        sim2_operator: device.sim2_operator,
        battery_level: Number(device.battery_level),
        last_sync_at: device.last_sync_at,
        status: device.status,
        created_at: device.created_at
      }
    });
  } catch (err) {
    console.error('[getDeviceById Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve device details.'
    });
  }
}

/**
 * POST /api/devices/:id/rotate-token
 * Regenerates the cryptographic pairing token for an existing handset.
 * Protected by authMiddleware + tenantMiddleware.
 */
export async function rotateDeviceToken(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brand.id;
    const deviceId = req.params.id;

    const device = await db.get(
      `SELECT id FROM devices WHERE id = ? AND brand_id = ?`,
      [deviceId, brandId]
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found.'
      });
    }

    const newToken = `tok_dev_${crypto.randomBytes(24).toString('hex')}`;

    await db.query(
      `UPDATE devices SET device_token = ? WHERE id = ? AND brand_id = ?`,
      [newToken, deviceId, brandId]
    );

    return res.status(200).json({
      success: true,
      message: 'Device token rotated successfully. Please update the handset immediately.',
      device_id: deviceId,
      device_token: newToken
    });
  } catch (err) {
    console.error('[rotateDeviceToken Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to rotate device token.'
    });
  }
}

/**
 * PATCH /api/devices/:id
 * Updates device configuration (name, model, SIM info, status).
 * Protected by authMiddleware + tenantMiddleware.
 */
export async function updateDevice(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brand.id;
    const deviceId = req.params.id;
    const { device_name, device_model, sim1_operator, sim2_operator, status } = req.body || {};

    const device = await db.get(
      `SELECT id FROM devices WHERE id = ? AND brand_id = ?`,
      [deviceId, brandId]
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found.'
      });
    }

    const updates = [];
    const params = [];

    if (device_name !== undefined) {
      const cleanName = String(device_name).trim();
      if (cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Device name must be between 2 and 100 characters.'
        });
      }
      updates.push('device_name = ?');
      params.push(cleanName);
    }

    if (device_model !== undefined) {
      updates.push('device_model = ?');
      params.push(device_model ? String(device_model).trim().slice(0, 100) : null);
    }

    if (sim1_operator !== undefined) {
      updates.push('sim1_operator = ?');
      params.push(sim1_operator ? String(sim1_operator).trim().slice(0, 50) : null);
    }

    if (sim2_operator !== undefined) {
      updates.push('sim2_operator = ?');
      params.push(sim2_operator ? String(sim2_operator).trim().slice(0, 50) : null);
    }

    if (status !== undefined) {
      const cleanStatus = String(status).trim().toLowerCase();
      if (!['active', 'offline', 'deactivated'].includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Status must be one of: active, offline, deactivated.'
        });
      }
      updates.push('status = ?');
      params.push(cleanStatus);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'NO_UPDATES',
        message: 'No updatable fields provided.'
      });
    }

    params.push(deviceId);
    params.push(brandId);

    await db.query(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ? AND brand_id = ?`,
      params
    );

    return res.status(200).json({
      success: true,
      message: 'Device updated successfully.'
    });
  } catch (err) {
    console.error('[updateDevice Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update device.'
    });
  }
}

/**
 * DELETE /api/devices/:id
 * Deletes or unpairs a device from the brand.
 * Protected by authMiddleware + tenantMiddleware.
 */
export async function deleteDevice(req, res) {
  try {
    const db = getDatabase();
    const brandId = req.brand.id;
    const deviceId = req.params.id;

    const device = await db.get(
      `SELECT id FROM devices WHERE id = ? AND brand_id = ?`,
      [deviceId, brandId]
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found.'
      });
    }

    await db.query(
      `DELETE FROM devices WHERE id = ? AND brand_id = ?`,
      [deviceId, brandId]
    );

    return res.status(200).json({
      success: true,
      message: 'Device unpaired and deleted successfully.'
    });
  } catch (err) {
    console.error('[deleteDevice Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete device.'
    });
  }
}

export default {
  syncSMS,
  deviceHeartbeat,
  getDeviceSelfStatus,
  listDevices,
  createDevice,
  getDeviceById,
  rotateDeviceToken,
  updateDevice,
  deleteDevice
};
