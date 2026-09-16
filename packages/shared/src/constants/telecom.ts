export type MFSProvider = "bKash" | "Nagad" | "Rocket" | "Upay";

/**
 * Immutable mapping of authorized telecom sender masks to canonical MFS Provider.
 * All keys are normalized to uppercase for case-insensitive lookup.
 */
export const TELECOM_SENDER_WHITELIST: Readonly<Record<string, MFSProvider>> = {
  "BKASH": "bKash",
  "16216": "Rocket",
  "NAGAD": "Nagad",
  "16222": "Nagad",
  "UPAY": "Upay"
} as const;

/**
 * Validates whether an incoming SMS sender address matches an approved carrier mask.
 * Automatically rejects standard 11-digit MSISDNs (+8801... / 01...) and arbitrary masks.
 */
export function isTelecomSenderWhitelisted(sender: string | null | undefined): boolean {
  if (!sender || typeof sender !== "string") {
    return false;
  }
  const normalized = sender.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(TELECOM_SENDER_WHITELIST, normalized);
}

/**
 * Resolves the canonical MFS provider name from a whitelisted sender mask.
 * Returns null if the sender is not whitelisted.
 */
export function resolveProviderFromSender(sender: string | null | undefined): MFSProvider | null {
  if (!sender || typeof sender !== "string") {
    return null;
  }
  const normalized = sender.trim().toUpperCase();
  return TELECOM_SENDER_WHITELIST[normalized] || null;
}

/**
 * Asserts that a sender address is whitelisted, throwing an error if invalid.
 */
export function assertWhitelistedSender(sender: string): MFSProvider {
  const provider = resolveProviderFromSender(sender);
  if (!provider) {
    throw new Error(`SECURITY_ALERT: Unauthorized SMS sender address '${sender}'. Dropped by telecom whitelist.`);
  }
  return provider;
}
