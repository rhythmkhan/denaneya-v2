export interface DebitCheckResult {
    isDebit: boolean;
    matchedPattern?: string;
    reason?: string;
}
/**
 * Compiled regular expressions for outbound debit/expense keywords.
 * Uses word boundaries and contextual grammar constraints to prevent false-positive substring matches.
 */
export declare const PROHIBITED_DEBIT_PATTERNS: ReadonlyArray<{
    pattern: RegExp;
    name: string;
}>;
/**
 * Inspects raw SMS message text for outbound debit indicators.
 * Normalizes invisible Unicode / zero-width characters before evaluation.
 * Note: Authentic receipts containing 'Fee Tk 0.00' or 'Charge Tk 0.00' will safely return isDebit: false.
 */
export declare function checkDebitBlacklist(message: string | null | undefined): DebitCheckResult;
//# sourceMappingURL=blacklist.d.ts.map