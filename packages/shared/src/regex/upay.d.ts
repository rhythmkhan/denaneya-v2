import { ParsedMfsData } from "../types/index.js";
/**
 * Parser for authentic UCB Upay credit notifications.
 * Example format:
 * - "You have received Tk 800.00 from 01512345678. Ref: Cart12. TrxID: UP998877 at 16/09/2026 18:10. Balance: Tk 12,800.00"
 */
export declare function parseUpaySms(rawMessage: string): ParsedMfsData | null;
//# sourceMappingURL=upay.d.ts.map