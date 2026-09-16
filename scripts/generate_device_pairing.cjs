#!/usr/bin/env node
/**
 * DenaNeya v2.0 - Handset Pairing Token & Canonical QR Code Generator CLI
 * File: scripts/generate_device_pairing.cjs
 *
 * Generates CSPRNG 96-bit Device IDs and 192-bit pairing tokens, builds the
 * canonical DenaNeya v2.0 pairing JSON payload, renders an instant terminal
 * ASCII QR code for handset camera scanning, and optionally registers the handset
 * directly into the live MySQL / SQLite database.
 *
 * Usage:
 *   node scripts/generate_device_pairing.cjs [options]
 *
 * Options:
 *   --brand-id <id>        Merchant brand ID (default: b101_deshi_course or discovered from DB)
 *   --brand-name <name>    Merchant brand display name (default: Deshi Course - দেশি কোর্স)
 *   --device-name <name>   Handset label (default: Counter 1 - Galaxy A15 MFS)
 *   --device-model <model> Phone hardware model (default: Samsung SM-A155F)
 *   --sim1 <op>            SIM 1 operator (default: Grameenphone (bKash))
 *   --sim2 <op>            SIM 2 operator (default: Robi (Nagad))
 *   --api-base <url>       API Base URL (default: https://denaneya.aihaat.shop)
 *   --save-db              Persist handset into the active database immediately
 *   --json-only            Print only the canonical JSON payload (useful for piping)
 *   --out <file>           Save pairing JSON configuration to a file
 *   --help, -h             Show help message
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables
let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.resolve(__dirname, '../node_modules/dotenv'));
}
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Resolve qrcode
let QRCode;
try {
  QRCode = require('qrcode');
} catch (e) {
  QRCode = require(path.resolve(__dirname, '../node_modules/qrcode'));
}

/**
 * Generates 96-bit Device ID and 192-bit Device Token
 */
function generateDeviceCredentials() {
  const deviceId = `dev_${crypto.randomBytes(12).toString('hex')}`;
  const deviceToken = `tok_dev_${crypto.randomBytes(24).toString('hex')}`;
  return { deviceId, deviceToken };
}

/**
 * Builds the canonical DenaNeya v2.0 Pairing Payload
 */
function generatePairingPayload({
  brandId = 'b101_deshi_course',
  brandName = 'Deshi Course - দেশি কোর্স',
  deviceId = null,
  deviceToken = null,
  apiBase = 'https://denaneya.aihaat.shop'
} = {}) {
  const credentials = (!deviceId || !deviceToken) ? generateDeviceCredentials() : { deviceId, deviceToken };

  const payload = {
    version: '2.0',
    brand_id: brandId,
    brand_name: brandName,
    device_id: credentials.deviceId,
    device_token: credentials.deviceToken,
    sync_endpoint: '/api/device/sync-sms',
    heartbeat_endpoint: '/api/device/heartbeat'
  };

  return {
    credentials,
    payload,
    jsonString: JSON.stringify(payload)
  };
}

/**
 * Generates terminal ASCII QR code and Base64 Data URL
 */
async function generatePairingQr(payloadJson) {
  const terminalQr = await QRCode.toString(payloadJson, {
    type: 'terminal',
    small: true
  });

  const dataUrl = await QRCode.toDataURL(payloadJson, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  return { terminalQr, dataUrl };
}

/**
 * Optionally registers the device into the active database
 */
async function saveDeviceToDatabase(deviceRecord) {
  let dbPkg;
  try {
    dbPkg = await import('@denaneya/database');
  } catch (e) {
    try {
      dbPkg = await import(path.resolve(__dirname, '../packages/database/dist/index.js'));
    } catch (e2) {
      console.warn('[DB Warning] Database package not resolvable. Skipping DB persistence.');
      return false;
    }
  }

  const { getDatabase } = dbPkg.default || dbPkg;
  const db = getDatabase();
  const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

  await db.query(
    `INSERT INTO devices (
       id, brand_id, device_name, device_model, device_token,
       sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 100, NULL, 'offline', ?)`,
    [
      deviceRecord.deviceId,
      deviceRecord.brandId,
      deviceRecord.deviceName,
      deviceRecord.deviceModel,
      deviceRecord.deviceToken,
      deviceRecord.sim1,
      deviceRecord.sim2,
      nowIso
    ]
  );
  return true;
}

// CLI Argument Parser Helper
function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    brandId: 'b101_deshi_course',
    brandName: 'Deshi Course - দেশি কোর্স',
    deviceName: 'Counter 1 - Galaxy A15 MFS',
    deviceModel: 'Samsung SM-A155F',
    sim1: 'Grameenphone (bKash)',
    sim2: 'Robi (Nagad)',
    apiBase: process.env.API_BASE_URL || 'https://denaneya.aihaat.shop',
    saveDb: false,
    jsonOnly: false,
    out: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--brand-id' && args[i + 1]) {
      options.brandId = args[++i];
    } else if (arg === '--brand-name' && args[i + 1]) {
      options.brandName = args[++i];
    } else if (arg === '--device-name' && args[i + 1]) {
      options.deviceName = args[++i];
    } else if (arg === '--device-model' && args[i + 1]) {
      options.deviceModel = args[++i];
    } else if (arg === '--sim1' && args[i + 1]) {
      options.sim1 = args[++i];
    } else if (arg === '--sim2' && args[i + 1]) {
      options.sim2 = args[++i];
    } else if (arg === '--api-base' && args[i + 1]) {
      options.apiBase = args[++i];
    } else if (arg === '--save-db') {
      options.saveDb = true;
    } else if (arg === '--json-only') {
      options.jsonOnly = true;
    } else if (arg === '--out' && args[i + 1]) {
      options.out = args[++i];
    }
  }

  return options;
}

async function main() {
  const options = parseCliArgs();

  if (options.help) {
    console.log(`
DenaNeya v2.0 - Handset Pairing & Canonical QR Code Generator CLI

Usage:
  node scripts/generate_device_pairing.cjs [options]

Options:
  --brand-id <id>        Merchant brand ID (default: b101_deshi_course)
  --brand-name <name>    Merchant brand display name (default: Deshi Course - দেশি কোর্স)
  --device-name <name>   Handset label (default: Counter 1 - Galaxy A15 MFS)
  --device-model <model> Phone hardware model (default: Samsung SM-A155F)
  --sim1 <op>            SIM 1 operator (default: Grameenphone (bKash))
  --sim2 <op>            SIM 2 operator (default: Robi (Nagad))
  --api-base <url>       API Base URL (default: https://denaneya.aihaat.shop)
  --save-db              Register the handset into the database immediately
  --json-only            Print only the raw canonical JSON payload
  --out <file>           Save pairing JSON configuration to a file
  --help, -h             Show this help screen
    `);
    process.exit(0);
  }

  const { credentials, payload, jsonString } = generatePairingPayload({
    brandId: options.brandId,
    brandName: options.brandName,
    apiBase: options.apiBase
  });

  if (options.jsonOnly) {
    console.log(jsonString);
    process.exit(0);
  }

  const { terminalQr, dataUrl } = await generatePairingQr(jsonString);

  console.log('======================================================================');
  console.log('📱 DENANEYA v2.0 — ANDROID HANDSET PAIRING & CANONICAL QR GENERATOR');
  console.log('======================================================================\n');

  console.log('--- 1. GENERATED DEVICE CREDENTIALS ---');
  console.log(`Device ID:       ${credentials.deviceId}`);
  console.log(`Device Token:    ${credentials.deviceToken}`);
  console.log(`Entropy:         192-bit CSPRNG token (56 characters)`);
  console.log(`Brand ID:        ${options.brandId}`);
  console.log(`Brand Name:      ${options.brandName}`);
  console.log(`Handset Name:    ${options.deviceName}`);
  console.log(`Hardware Model:  ${options.deviceModel}`);
  console.log(`SIM 1 Operator:  ${options.sim1}`);
  console.log(`SIM 2 Operator:  ${options.sim2}\n`);

  console.log('--- 2. CANONICAL QR CODE PAYLOAD (v2.0 SCHEMA) ---');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n--- 3. SCAN-READY TERMINAL QR CODE ---');
  console.log('Point your Android camera or MacroDroid/SMS Forwarder scanner here:\n');
  console.log(terminalQr);

  const cleanBase = (options.apiBase || 'https://denaneya.aihaat.shop').replace(/\/api\/?$/, '');

  console.log('--- 4. HTTP REQUEST FORWARDER CONFIGURATION ---');
  console.log(`Target Ingest URL:    ${cleanBase}${payload.sync_endpoint}`);
  console.log(`Target Heartbeat URL: ${cleanBase}${payload.heartbeat_endpoint}`);
  console.log(`Auth Header:          X-Device-Token: ${credentials.deviceToken}`);
  console.log(`Content-Type:         application/json\n`);

  if (options.saveDb) {
    try {
      console.log('--- 5. DATABASE REGISTRATION ---');
      console.log('Connecting to database to persist handset record...');
      const saved = await saveDeviceToDatabase({
        ...credentials,
        brandId: options.brandId,
        deviceName: options.deviceName,
        deviceModel: options.deviceModel,
        sim1: options.sim1,
        sim2: options.sim2
      });
      if (saved) {
        console.log(`[PASS] Handset '${options.deviceName}' successfully registered in database.`);
      }
    } catch (err) {
      console.error(`[FAIL] Could not register handset in database: ${err.message}`);
    }
  }

  if (options.out) {
    const outPath = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({
      credentials,
      payload,
      qr_data_url: dataUrl,
      created_at: new Date().toISOString()
    }, null, 2));
    console.log(`\n[Export] Saved pairing configuration to ${outPath}`);
  }

  console.log('\n======================================================================');
  console.log('✅ Handset Pairing Ready. Follow ANDROID_SETUP_GUIDE.md to complete setup.');
  console.log('======================================================================');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error in generate_device_pairing:', err);
    process.exit(1);
  });
}

module.exports = {
  generateDeviceCredentials,
  generatePairingPayload,
  generatePairingQr,
  saveDeviceToDatabase,
  main
};
