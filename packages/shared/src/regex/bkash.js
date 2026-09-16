/**
 * Parser for authentic bKash credit notifications.
 * Example formats:
 * - "You have received Tk 1,250.00 from 01712345678. Ref Invoice-101. Fee Tk 0.00. Balance Tk 15,250.00. TrxID BLK998877 at 16/09/2026 14:20"
 * - "You have received payment Tk 500.00 from 01812345678. Ref Store. Fee Tk 0.00. Balance Tk 5,500.00. TrxID 9K87J6H5 at 16/09/2026 15:30"
 */
export function parseBkashSms(rawMessage) {
    // Enforce directional credit wording
    const amountMatch = rawMessage.match(/(?:You have received(?:\s+payment)?|received)\s+Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const trxMatch = rawMessage.match(/\bTrxID\s*[:]?\s*([A-Za-z0-9]+)\b/i);
    if (!amountMatch || !trxMatch) {
        return null;
    }
    const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (isNaN(rawAmount) || rawAmount <= 0) {
        return null;
    }
    const trxId = trxMatch[1].trim().toUpperCase();
    const senderMatch = rawMessage.match(/\bfrom\s*(01[3-9][0-9]{8}|01[3-9]\*{3,4}[0-9]{3,4})\b/i);
    const refMatch = rawMessage.match(/\bRef\s*[:]?\s*([^.]+?)(?:\.|\s+Fee|\s+Balance|\s+at|\s*$)/i);
    const balMatch = rawMessage.match(/\bBalance\s*Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const dateMatch = rawMessage.match(/(?:at|on)\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)/i);
    return {
        provider: "bKash",
        trxId,
        amount: rawAmount,
        amountPaisa: Math.round(rawAmount * 100),
        senderNumber: senderMatch ? senderMatch[1] : "Unknown",
        smsRef: refMatch ? refMatch[1].trim() : "",
        balance: balMatch ? parseFloat(balMatch[1].replace(/,/g, "")) : null,
        transactionDate: dateMatch ? dateMatch[1].trim() : null
    };
}
//# sourceMappingURL=bkash.js.map