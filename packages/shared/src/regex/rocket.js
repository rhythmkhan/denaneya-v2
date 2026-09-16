/**
 * Parser for authentic DBBL Rocket (16216) credit notifications.
 * Example format:
 * - "Tk 1,500.00 received from 01712345678 to A/C 017123456789. Fee Tk 0.00, Balance Tk 25,000.00. TxnId: 9876543210 on 16-Sep-2026 17:00"
 */
export function parseRocketSms(rawMessage) {
    const amountMatch = rawMessage.match(/Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*received/i);
    const trxMatch = rawMessage.match(/\b(?:TxnId|TrxID|TxnID)\s*[:]?\s*([A-Za-z0-9]+)\b/i);
    if (!amountMatch || !trxMatch) {
        return null;
    }
    const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (isNaN(rawAmount) || rawAmount <= 0) {
        return null;
    }
    const trxId = trxMatch[1].trim().toUpperCase();
    const senderMatch = rawMessage.match(/\bfrom\s*(01[3-9][0-9]{8}|01[3-9]\*{3,4}[0-9]{3,4})\b/i);
    const balMatch = rawMessage.match(/\bBalance\s*Tk\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const dateMatch = rawMessage.match(/\bon\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2})/i);
    return {
        provider: "Rocket",
        trxId,
        amount: rawAmount,
        amountPaisa: Math.round(rawAmount * 100),
        senderNumber: senderMatch ? senderMatch[1] : "Unknown",
        smsRef: "",
        balance: balMatch ? parseFloat(balMatch[1].replace(/,/g, "")) : null,
        transactionDate: dateMatch ? dateMatch[1].trim() : null
    };
}
//# sourceMappingURL=rocket.js.map