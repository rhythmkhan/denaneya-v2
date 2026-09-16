/**
 * DenaNeya v2.0 - RFC 6238 TOTP Two-Factor Authentication Engine
 * Native Node.js crypto implementation (HMAC-SHA1, 30s step, 6 digits).
 * Features Base32 encode/decode, 90s anti-replay cache, AES-256-GCM secret
 * encryption at rest, 8 single-use hashed backup recovery codes, and QR codes.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

// RFC 4648 Base32 Alphabet
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const OTP_DIGITS = 6;
const REPLAY_TTL_MS = 90 * 1000; // 90 seconds

/**
 * Encode a Buffer into an RFC 4648 Base32 string (unpadded).
 * @param {Buffer} buffer
 * @returns {string}
 */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decode an RFC 4648 Base32 string into a Buffer.
 * Tolerates spaces, hyphens, and '=' padding.
 * @param {string} input
 * @returns {Buffer}
 */
export function base32Decode(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Base32 input must be a string');
  }
  const clean = input.toUpperCase().replace(/[\s\-=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = RFC4648_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character encountered: '${clean[i]}'`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generate an RFC 4226 HOTP 6-digit code for a given counter.
 * @param {string|Buffer} secret - Base32 string or decoded Buffer
 * @param {number|bigint} counter
 * @returns {string} 6-digit zero-padded OTP
 */
export function generateHOTP(secret, counter) {
  const secretBuf = typeof secret === 'string' ? base32Decode(secret) : secret;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** OTP_DIGITS;
  return otp.toString().padStart(OTP_DIGITS, '0');
}

/**
 * Generate an RFC 6238 TOTP 6-digit code.
 * @param {string|Buffer} secret
 * @param {number} [timestampSeconds] - Current epoch in seconds
 * @param {number} [stepSeconds=30]
 * @returns {string} 6-digit zero-padded OTP
 */
export function generateTOTP(secret, timestampSeconds = Math.floor(Date.now() / 1000), stepSeconds = STEP_SECONDS) {
  const counter = Math.floor(timestampSeconds / stepSeconds);
  return generateHOTP(secret, counter);
}

/**
 * In-Memory Anti-Replay Cache with 90s TTL.
 * Prevents identical OTP submissions within the active validation window.
 */
export class AntiReplayCache {
  constructor(ttlMs = REPLAY_TTL_MS) {
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  isUsed(userId, step, nowMs = Date.now()) {
    const key = `${userId}:${step}`;
    const expiresAt = this.cache.get(key);
    if (!expiresAt) return false;
    if (expiresAt <= nowMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  recordUsed(userId, step, nowMs = Date.now()) {
    const key = `${userId}:${step}`;
    this.cache.set(key, nowMs + this.ttlMs);
    this.prune(nowMs);
  }

  prune(nowMs = Date.now()) {
    for (const [key, expiresAt] of this.cache.entries()) {
      if (expiresAt <= nowMs) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const antiReplayCache = new AntiReplayCache();

/**
 * Verify a TOTP code against secret with ±30s window tolerance and anti-replay protection.
 * @param {string|Buffer} secret
 * @param {string} candidateCode
 * @param {Object} [options]
 * @param {string} [options.userId] - Required for anti-replay check
 * @param {number} [options.timestampSeconds] - Epoch timestamp in seconds
 * @param {number} [options.stepSeconds=30]
 * @param {number} [options.window=1] - Tolerance in steps (1 = ±30s)
 * @param {boolean} [options.preventReplay=true]
 * @returns {{ valid: boolean, reason?: string, matchedStep?: number, delta?: number }}
 */
export function verifyTOTP(secret, candidateCode, options = {}) {
  const userId = options.userId || 'anonymous';
  const timestampSeconds = options.timestampSeconds !== undefined
    ? options.timestampSeconds
    : Math.floor(Date.now() / 1000);
  const stepSeconds = options.stepSeconds || STEP_SECONDS;
  const window = options.window !== undefined ? options.window : 1;
  const preventReplay = options.preventReplay !== false;

  const normalized = String(candidateCode || '').trim();
  if (!/^\d{6}$/.test(normalized)) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const currentStep = Math.floor(timestampSeconds / stepSeconds);
  // Check current step first (0), then past (-1), then future (+1)
  const deltas = [0, -1, 1];

  for (const delta of deltas) {
    if (Math.abs(delta) > window) continue;
    const step = currentStep + delta;
    const expected = generateHOTP(secret, step);

    if (crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected))) {
      const nowMs = timestampSeconds * 1000;
      if (preventReplay && antiReplayCache.isUsed(userId, step, nowMs)) {
        return { valid: false, reason: 'REPLAY_DETECTED', matchedStep: step, delta };
      }
      if (preventReplay) {
        antiReplayCache.recordUsed(userId, step, nowMs);
      }
      return { valid: true, matchedStep: step, delta };
    }
  }

  return { valid: false, reason: 'CODE_MISMATCH' };
}

/**
 * Generate a new 160-bit (20-byte) cryptographically secure Base32 secret.
 * @returns {{ secret: string, formattedSecret: string }}
 */
export function generateSecret() {
  const buffer = crypto.randomBytes(20);
  const secret = base32Encode(buffer);
  const formattedSecret = secret.match(/.{1,4}/g).join(' ');
  return { secret, formattedSecret };
}

/**
 * Format standard otpauth:// URI for authenticator applications.
 * @param {string} accountName - Admin email or username
 * @param {string} secret - Base32 secret
 * @param {string} [issuer='DenaNeya']
 * @returns {string}
 */
export function generateOtpauthUri(accountName, secret, issuer = 'DenaNeya') {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${OTP_DIGITS}&period=${STEP_SECONDS}`;
}

/**
 * Generate scannable QR Code Data URL (PNG base64).
 * @param {string} otpauthUri
 * @returns {Promise<string>}
 */
export async function generateQRCodeDataUrl(otpauthUri) {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256
  });
}

/**
 * Generate 8 emergency backup recovery codes in XXXX-XXXX format.
 * @param {number} [count=8]
 * @returns {string[]} Plaintext backup codes
 */
export function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Hash an array of backup recovery codes using bcrypt (10 rounds).
 * @param {string[]} codes
 * @returns {Promise<string[]>}
 */
export async function hashBackupCodes(codes) {
  const hashes = [];
  for (const code of codes) {
    const normalized = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(normalized, salt);
    hashes.push(hash);
  }
  return hashes;
}

/**
 * Verify a submitted recovery code against stored bcrypt hashes.
 * @param {string} candidateCode
 * @param {string[]} hashedCodes
 * @returns {Promise<{ valid: boolean, matchedIndex: number }>}
 */
export async function verifyBackupCode(candidateCode, hashedCodes) {
  if (!candidateCode || !Array.isArray(hashedCodes) || hashedCodes.length === 0) {
    return { valid: false, matchedIndex: -1 };
  }
  const normalized = String(candidateCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    const raw = String(hashedCodes[i]);
    let isMatch = false;
    if (raw.startsWith('$2a$') || raw.startsWith('$2b$')) {
      try {
        isMatch = await bcrypt.compare(normalized, raw);
      } catch (_) {}
    } else {
      const plainNorm = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      isMatch = normalized === plainNorm;
    }
    if (isMatch) {
      return { valid: true, matchedIndex: i };
    }
  }
  return { valid: false, matchedIndex: -1 };
}

/**
 * AES-256-GCM encryption for TOTP secret storage at rest.
 */
function getEncryptionKey() {
  const rawKey = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET || 'denaneya_development_jwt_secret_min_32_bytes_long_12345';
  return crypto.createHash('sha256').update(rawKey).digest();
}

export function encryptSecret(plainSecret, key = getEncryptionKey()) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encryptedPayload, key = getEncryptionKey()) {
  if (!encryptedPayload || !encryptedPayload.includes(':')) {
    return encryptedPayload; // Fallback for unencrypted legacy secrets
  }
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) return encryptedPayload;
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
