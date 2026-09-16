import crypto from "crypto";
import { canonicalizeJson } from "./canonicalize.js";

export interface HmacSignatureOutput {
  signature: string;
  timestamp: number;
  nonce: string;
  header: string;
  headers: Record<string, string>;
}

export interface HmacVerificationResult {
  valid: boolean;
  timestamp?: number;
  nonce?: string;
  error?: string;
}

export interface NonceStore {
  has(nonce: string): boolean;
  set(nonce: string, expiryTimestamp: number): void;
  clear?(): void;
}

export interface VerifyWebhookOptions {
  nonceStore?: NonceStore | Map<string, number>;
  skipNonceCheck?: boolean;
}

/**
 * In-memory TTL nonce cache for single-process nonce replay defense.
 */
const defaultNonceCache = new Map<string, number>();

function purgeExpiredNonces(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [nonce, expiry] of defaultNonceCache.entries()) {
    if (expiry <= now) {
      defaultNonceCache.delete(nonce);
    }
  }
}

/**
 * Clears the in-memory nonce cache. Useful for test suites.
 */
export function clearWebhookNonceCache(): void {
  defaultNonceCache.clear();
}

/**
 * Known default or insecure webhook secrets that must be rejected.
 */
const INSECURE_DEFAULT_SECRETS: ReadonlySet<string> = new Set([
  "default_zinipay_secret",
  "default_secret",
  "changeme",
  "secret",
  "password",
  "12345678901234567890123456789012"
]);

/**
 * Validates that a webhook secret meets minimum cryptographic entropy requirements.
 * Rejects legacy fallback secrets, secrets shorter than 32 characters, whitespace-only
 * strings, repeated single characters, and secrets with fewer than 4 unique characters.
 */
export function validateWebhookSecret(secret: string): void {
  if (!secret || typeof secret !== "string") {
    throw new Error("SECURITY_ERROR: Webhook secret must be a non-empty string.");
  }

  const trimmed = secret.trim();
  if (trimmed.length === 0) {
    throw new Error("SECURITY_ERROR: Webhook secret has insufficient entropy (cannot be whitespace-only).");
  }

  if (secret.length < 32 || trimmed.length < 32) {
    throw new Error("SECURITY_ERROR: Webhook secret has insufficient entropy (must be at least 32 characters).");
  }

  if (INSECURE_DEFAULT_SECRETS.has(secret) || INSECURE_DEFAULT_SECRETS.has(trimmed)) {
    throw new Error("SECURITY_ERROR: Webhook secret has insufficient entropy (insecure default secret).");
  }

  if (/[\x00-\x1F\x7F]/.test(secret)) {
    throw new Error("SECURITY_ERROR: Webhook secret contains prohibited control characters.");
  }

  if (/^(.)\1+$/.test(secret) || /^(.)\1+$/.test(trimmed)) {
    throw new Error("SECURITY_ERROR: Webhook secret has insufficient entropy (cannot consist of a single repeated character).");
  }

  const uniqueChars = new Set(trimmed).size;
  if (uniqueChars < 4) {
    throw new Error("SECURITY_ERROR: Webhook secret has insufficient entropy (requires at least 4 unique characters).");
  }
}

/**
 * Generates an HMAC-SHA256 signature over canonicalized JSON payload.
 */
export function generateWebhookSignature(
  payload: unknown,
  secret: string,
  explicitTimestamp?: number,
  explicitNonce?: string
): HmacSignatureOutput {
  validateWebhookSecret(secret);

  const timestamp = explicitTimestamp ?? Math.floor(Date.now() / 1000);
  const nonce = explicitNonce ?? crypto.randomUUID();
  const canonicalBody = canonicalizeJson(payload);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${canonicalBody}`)
    .digest("hex");

  const header = `t=${timestamp},n=${nonce},v1=${signature}`;

  return {
    signature,
    timestamp,
    nonce,
    header,
    headers: {
      "X-DenaNeya-Signature": header,
      "X-DenaNeya-Timestamp": String(timestamp),
      "X-DenaNeya-Nonce": nonce,
      "x-zinipay-signature": signature,
      "x-zinipay-timestamp": String(timestamp),
      "x-zinipay-nonce": nonce
    }
  };
}

/**
 * Verifies an incoming HMAC-SHA256 signature against payload, timestamp, and nonce.
 */
export function verifyWebhookSignature(
  payload: unknown,
  signatureHeaderOrMap: string | Record<string, string | string[] | undefined>,
  secret: string,
  toleranceSeconds: number = 300,
  options: VerifyWebhookOptions = {}
): HmacVerificationResult {
  try {
    validateWebhookSecret(secret);
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }

  let rawHeader = "";
  if (typeof signatureHeaderOrMap === "string") {
    rawHeader = signatureHeaderOrMap;
  } else if (signatureHeaderOrMap && typeof signatureHeaderOrMap === "object") {
    const candidate =
      signatureHeaderOrMap["x-denaneya-signature"] ||
      signatureHeaderOrMap["X-DenaNeya-Signature"] ||
      signatureHeaderOrMap["x-zinipay-signature"];

    if (Array.isArray(candidate)) {
      rawHeader = candidate[0] || "";
    } else if (typeof candidate === "string") {
      rawHeader = candidate;
    }
  }

  if (!rawHeader) {
    return { valid: false, error: "MISSING_SIGNATURE_HEADER" };
  }

  // Parse t=...,n=...,v1=... format
  const parsedHeaders: Record<string, string> = {};
  if (rawHeader.includes("t=") || rawHeader.includes("v1=")) {
    const parts = rawHeader.split(",");
    for (const part of parts) {
      const eqIdx = part.indexOf("=");
      if (eqIdx !== -1) {
        const k = part.substring(0, eqIdx).trim();
        const v = part.substring(eqIdx + 1).trim();
        parsedHeaders[k] = v;
      }
    }
  } else {
    // Support legacy raw hex signature if header is just hex and timestamp/nonce passed separately in object
    if (typeof signatureHeaderOrMap === "object") {
      const t = signatureHeaderOrMap["x-denaneya-timestamp"] || signatureHeaderOrMap["x-zinipay-timestamp"];
      const n = signatureHeaderOrMap["x-denaneya-nonce"] || signatureHeaderOrMap["x-zinipay-nonce"];
      parsedHeaders["v1"] = rawHeader;
      if (typeof t === "string") parsedHeaders["t"] = t;
      if (typeof n === "string") parsedHeaders["n"] = n;
    }
  }

  const timestamp = parseInt(parsedHeaders["t"] || "", 10);
  const nonce = parsedHeaders["n"] || "";
  const candidateSig = parsedHeaders["v1"];

  if (isNaN(timestamp) || !candidateSig) {
    return { valid: false, error: "MALFORMED_SIGNATURE_HEADER" };
  }

  // Freshness & Replay Check
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { valid: false, error: "TIMESTAMP_OUT_OF_TOLERANCE" };
  }

  // Reconstruct canonical hash
  const canonicalBody = canonicalizeJson(payload);
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${canonicalBody}`)
    .digest("hex");

  const candidateBuf = Buffer.from(candidateSig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");

  if (candidateBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(candidateBuf, expectedBuf)) {
    return { valid: false, error: "SIGNATURE_MISMATCH" };
  }

  // Nonce Replay Check (runs only after HMAC signature is cryptographically verified)
  const nonceCache = options.nonceStore ?? defaultNonceCache;
  if (nonce && options.skipNonceCheck !== true) {
    purgeExpiredNonces();
    if (nonceCache.has(nonce)) {
      return { valid: false, error: "REPLAYED_NONCE" };
    }
    nonceCache.set(nonce, timestamp + toleranceSeconds);
  }

  return { valid: true, timestamp, nonce };
}
