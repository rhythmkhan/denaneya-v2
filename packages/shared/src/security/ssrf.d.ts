import https from "https";
export interface ResolvedAddress {
    address: string;
    family: number;
}
/**
 * Checks whether an IPv4 address (represented as 4 numerical octets)
 * falls into any private, loopback, link-local, multicast, or reserved subnet.
 */
export declare function isProhibitedIPv4Bytes(a: number, b: number, c: number, _d: number): boolean;
/**
 * Parses any valid RFC 4291 / RFC 5952 IPv6 address into its canonical 16-byte representation.
 * Supports zero compression (::), dual IPv4 notation (::ffff:127.0.0.1), and hex notation.
 * Returns null if the address is malformed.
 */
export declare function parseIPv6ToBytes(ip: string): Uint8Array | null;
/**
 * Validates whether an IPv4 or IPv6 address belongs to a prohibited/internal subnet.
 * Robustly normalizes all representations: standard IPv4, octal/hex rejection,
 * IPv4-mapped IPv6 (both hex and dotted), uncompressed IPv6, NAT64 (RFC 6052),
 * IPv4-compatible (RFC 4291), 6to4 (RFC 3056), and cloud metadata.
 * Returns true if prohibited; false if safe/public.
 */
export declare function isProhibitedIP(ip: string): boolean;
/**
 * Checks whether a given IP address or hostname represents a loopback address
 * (127.0.0.0/8, ::1, ::ffff:127.0.0.1, or localhost).
 */
export declare function isLoopbackAddress(hostOrIp: string): boolean;
/**
 * Validates a target webhook URL for SSRF vulnerabilities.
 * Resolves DNS hostnames and verifies all resolved IP addresses against private subnets.
 * Returns the first validated IP address for socket pinning.
 */
export declare function validateWebhookUrl(targetUrl: string, options?: {
    allowHttpForTesting?: boolean;
}): Promise<{
    valid: boolean;
    pinnedAddress?: string;
    ipFamily?: number;
    error?: string;
}>;
/**
 * Creates an HTTPS Agent with socket IP pinning to prevent DNS rebinding attacks.
 */
export declare function createPinnedHttpsAgent(pinnedIp: string, ipFamily: number): https.Agent;
//# sourceMappingURL=ssrf.d.ts.map