import { ParsedMfsData } from "../types/index.js";

/**
 * Parser for authentic Nagad credit notifications.
 * Example formats:
 * - "Money Received. Amount: Tk 2,500.00. Sender: 01912345678. Ref: Order55. TxnID: 7HG6F5D4. Date: 16/09/2026 16:45"
 * - "You have received Tk 1,000.00 from 01612345678. TxnID: 8JH76GF5"
 */
export function parseNagadSms(rawMessage: string): ParsedMfsData | null {
  const amountMatch = rawMessage.match(/(?:Amount\s*[:]?\s*Tk|Money Received\.\s*Amount\s*[:]?\s*Tk|received\s+Tk)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const trxMatch = rawMessage.match(/\b(?:TxnID|TrxID)\s*[:]?\s*([A-Za-z0-9]+)\b/i);

  if (!amountMatch || !trxMatch) {
    return null;
  }

  const rawAmount = parseFloat(amountMatch[1]!.replace(/,/g, ""));
  if (isNaN(rawAmount) || rawAmount <= 0) {
    return null;
  }

  const trxId = trxMatch[1]!.trim().toUpperCase();
  const senderMatch = rawMessage.match(/\b(?:Sender|from)\s*[:]?\s*(01[3-9][0-9]{8}|01[3-9]\*{3,4}[0-9]{3,4})\b/i);
  const refMatch = rawMessage.match(/\bRef(?:erence)?\s*[:]?\s*([^.]+?)(?:\.|\s+TxnID|\s+Date|\s+Balance|\s*$)/i);
  const balMatch = rawMessage.match(/\bBalance\s*[:]?\s*Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const dateMatch = rawMessage.match(/\bDate\s*[:]?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)/i);

  return {
    provider: "Nagad",
    trxId,
    amount: rawAmount,
    amountPaisa: Math.round(rawAmount * 100),
    senderNumber: senderMatch ? senderMatch[1]! : "Unknown",
    smsRef: refMatch ? refMatch[1]!.trim() : "",
    balance: balMatch ? parseFloat(balMatch[1]!.replace(/,/g, "")) : null,
    transactionDate: dateMatch ? dateMatch[1]!.trim() : null
  };
}
