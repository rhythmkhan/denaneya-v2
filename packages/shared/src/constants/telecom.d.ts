export type MFSProvider = "bKash" | "Nagad" | "Rocket" | "Upay";
/**
 * Immutable mapping of authorized telecom sender masks to canonical MFS Provider.
 * All keys are normalized to uppercase for case-insensitive lookup.
 */
export declare const TELECOM_SENDER_WHITELIST: Readonly<Record<string, MFSProvider>>;
/**
 * Validates whether an incoming SMS sender address matches an approved carrier mask.
 * Automatically rejects standard 11-digit MSISDNs (+8801... / 01...) and arbitrary masks.
 */
export declare function isTelecomSenderWhitelisted(sender: string | null | undefined): boolean;
/**
 * Resolves the canonical MFS provider name from a whitelisted sender mask.
 * Returns null if the sender is not whitelisted.
 */
export declare function resolveProviderFromSender(sender: string | null | undefined): MFSProvider | null;
/**
 * Asserts that a sender address is whitelisted, throwing an error if invalid.
 */
export declare function assertWhitelistedSender(sender: string): MFSProvider;
//# sourceMappingURL=telecom.d.ts.map