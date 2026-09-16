/**
 * Parser for authentic UCB Upay credit notifications.
 * Example format:
 * - "You have received Tk 800.00 from 01512345678. Ref: Cart12. TrxID: UP998877 at 16/09/2026 18:10. Balance: Tk 12,800.00"
 */
export function parseUpaySms(rawMessage) {
    const amountMatch = rawMessage.match(/(?:You have received|received)\s+Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const trxMatch = rawMessage.match(/\b(?:TrxID|TxnID)\s*[:]?\s*([A-Za-z0-9]+)\b/i);
    if (!amountMatch || !trxMatch) {
        return null;
    }
    const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (isNaN(rawAmount) || rawAmount <= 0) {
        return null;
    }
    const trxId = trxMatch[1].trim().toUpperCase();
    const senderMatch = rawMessage.match(/\bfrom\s*(01[3-9][0-9]{8}|01[3-9]\*{3,4}[0-9]{3,4})\b/i);
    const refMatch = rawMessage.match(/\bRef\s*[:]?\s*([^.]+?)(?:\.|\s+TrxID|\s+at|\s+Balance|\s*$)/i);
    const balMatch = rawMessage.match(/\bBalance\s*[:]?\s*Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const dateMatch = rawMessage.match(/(?:at|on)\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2})/i);
    return {
        provider: "Upay",
        trxId,
        amount: rawAmount,
        amountPaisa: Math.round(rawAmount * 100),
        senderNumber: senderMatch ? senderMatch[1] : "Unknown",
        smsRef: refMatch ? refMatch[1].trim() : "",
        balance: balMatch ? parseFloat(balMatch[1].replace(/,/g, "")) : null,
        transactionDate: dateMatch ? dateMatch[1].trim() : null
    };
}
//# sourceMappingURL=upay.js.map