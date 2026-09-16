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
 * Clears the in-memory nonce cache. Useful for test suites.
 */
export declare function clearWebhookNonceCache(): void;
/**
 * Validates that a webhook secret meets minimum cryptographic entropy requirements.
 * Rejects legacy fallback secrets, secrets shorter than 32 characters, whitespace-only
 * strings, repeated single characters, and secrets with fewer than 4 unique characters.
 */
export declare function validateWebhookSecret(secret: string): void;
/**
 * Generates an HMAC-SHA256 signature over canonicalized JSON payload.
 */
export declare function generateWebhookSignature(payload: unknown, secret: string, explicitTimestamp?: number, explicitNonce?: string): HmacSignatureOutput;
/**
 * Verifies an incoming HMAC-SHA256 signature against payload, timestamp, and nonce.
 */
export declare function verifyWebhookSignature(payload: unknown, signatureHeaderOrMap: string | Record<string, string | string[] | undefined>, secret: string, toleranceSeconds?: number, options?: VerifyWebhookOptions): HmacVerificationResult;
//# sourceMappingURL=hmac.d.ts.map