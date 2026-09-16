import { ParseSmsResult } from "../types/index.js";
/**
 * Comprehensive parser pipeline for carrier SMS ingestion.
 * Steps:
 * 1. Checks originating sender against Telecom Whitelist (VULN-02).
 * 2. Checks message body against Debit Keyword Blacklist (VULN-05).
 * 3. Routes message to provider-specific parser.
 * 4. Normalizes monetary value to minor units (paisa).
 */
export declare function parseIncomingSms(sender: string, rawMessage: string): ParseSmsResult;
//# sourceMappingURL=parser.d.ts.map