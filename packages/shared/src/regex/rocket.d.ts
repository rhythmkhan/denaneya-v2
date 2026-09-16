import { ParsedMfsData } from "../types/index.js";
/**
 * Parser for authentic DBBL Rocket (16216) credit notifications.
 * Example format:
 * - "Tk 1,500.00 received from 01712345678 to A/C 017123456789. Fee Tk 0.00, Balance Tk 25,000.00. TxnId: 9876543210 on 16-Sep-2026 17:00"
 */
export declare function parseRocketSms(rawMessage: string): ParsedMfsData | null;
//# sourceMappingURL=rocket.d.ts.map