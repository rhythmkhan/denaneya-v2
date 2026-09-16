import { ParsedMfsData } from "../types/index.js";
/**
 * Parser for authentic Nagad credit notifications.
 * Example formats:
 * - "Money Received. Amount: Tk 2,500.00. Sender: 01912345678. Ref: Order55. TxnID: 7HG6F5D4. Date: 16/09/2026 16:45"
 * - "You have received Tk 1,000.00 from 01612345678. TxnID: 8JH76GF5"
 */
export declare function parseNagadSms(rawMessage: string): ParsedMfsData | null;
//# sourceMappingURL=nagad.d.ts.map