import { ParsedMfsData } from "../types/index.js";
/**
 * Parser for authentic bKash credit notifications.
 * Example formats:
 * - "You have received Tk 1,250.00 from 01712345678. Ref Invoice-101. Fee Tk 0.00. Balance Tk 15,250.00. TrxID BLK998877 at 16/09/2026 14:20"
 * - "You have received payment Tk 500.00 from 01812345678. Ref Store. Fee Tk 0.00. Balance Tk 5,500.00. TrxID 9K87J6H5 at 16/09/2026 15:30"
 */
export declare function parseBkashSms(rawMessage: string): ParsedMfsData | null;
//# sourceMappingURL=bkash.d.ts.map