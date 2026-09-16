/**
 * Compiled regular expressions for outbound debit/expense keywords.
 * Uses word boundaries and contextual grammar constraints to prevent false-positive substring matches.
 */
export const PROHIBITED_DEBIT_PATTERNS = [
    // 1. Cash Out: Supports standard, hyphenated ("Cash-Out"), underscore ("Cash_Out"), spaced ("Cash - Out"), and compound ("Cashout")
    { pattern: /\bCash[-_\s]*Out\b/i, name: "Cash Out" },
    // 2. Send Money: Standard outbound P2P transfer
    { pattern: /\bSend\s*Money(?:\s+to)?\b/i, name: "Send Money" },
    // 3. Customer Payment Outbound: Matches "Payment to <recip>" and "Payment Tk <amount> to <recip>"
    // Strictly requires recipient preposition 'to' to avoid colliding with authentic merchant receipt "...received payment Tk 500.00 from..."
    { pattern: /\bPayment\s+(?:(?:of\s+)?(?:(?:Tk|BDT|৳)\.?\s*)?[0-9,.]+\s+)?to\b/i, name: "Payment to" },
    // 4. Customer Paid Outbound: Matches "Paid to <recip>" and "Paid Tk <amount> to <recip>"
    { pattern: /\bPaid\s+(?:(?:of\s+)?(?:(?:Tk|BDT|৳)\.?\s*)?[0-9,.]+\s+)?to\b/i, name: "Paid to" },
    // 5. Cash Out Fee: Outbound agent/ATM withdrawal fee notice
    { pattern: /\bCash[-_\s]*Out[-\s]*Fee\b/i, name: "Cash Out Fee" },
    // 6. Debit: Matches root "Debit", colon-delimited "Debit:", and inflections ("Debited", "Debiting", "Debits")
    { pattern: /\bDebit(?:ed|ing|s)?\b/i, name: "Debit" },
    // 7. Non-Zero Fee: Matches fee statements with an amount strictly > 0 (e.g. "Fee Tk 10.00", "Fee: 10", "Fee Tk 0.50")
    // Strictly permits authentic zero-fee receipts ("Fee Tk 0.00", "Fee: 0", "Fee: Tk 0.00")
    { pattern: /\bFee\s*[:]?\s*(?:(?:Tk|BDT|৳)\.?\s*)?(?:0*[1-9][0-9,]*(?:\.[0-9]+)?|0*\.0*[1-9][0-9]*)\b/i, name: "Fee" },
    // 8. Non-Zero Charge: Matches service charge statements with an amount strictly > 0 (e.g. "Charge Tk 15.00")
    // Strictly permits authentic zero-charge receipts ("Charge Tk 0.00", "Charge: 0")
    { pattern: /\bCharge\s*[:]?\s*(?:(?:Tk|BDT|৳)\.?\s*)?(?:0*[1-9][0-9,]*(?:\.[0-9]+)?|0*\.0*[1-9][0-9]*)\b/i, name: "Charge" },
    // 9. Transfer Outbound: Matches "Transfer to <wallet>" and "Transfer Tk <amount> to <wallet>"
    { pattern: /\bTransfer(?:red)?\s+(?:(?:of\s+)?(?:(?:Tk|BDT|৳)\.?\s*)?[0-9,.]+\s+)?to\b/i, name: "Transfer to" },
    // 10. Transferred Amount: Matches "Transferred Tk 400.00"
    { pattern: /\bTransferred\s+(?:(?:Tk|BDT|৳)\.?\s*)?[0-9,.]+/i, name: "Transferred Tk" },
    // 11. Mobile Recharge: Airtime purchase outbound debit
    { pattern: /\bMobile[-\s]*Recharge\b/i, name: "Mobile Recharge" },
    // 12. Request Money: Payment solicitation
    { pattern: /\bRequest\s*Money\b/i, name: "Request Money" }
];
/**
 * Inspects raw SMS message text for outbound debit indicators.
 * Normalizes invisible Unicode / zero-width characters before evaluation.
 * Note: Authentic receipts containing 'Fee Tk 0.00' or 'Charge Tk 0.00' will safely return isDebit: false.
 */
export function checkDebitBlacklist(message) {
    if (!message || typeof message !== "string") {
        return { isDebit: false };
    }
    // Neutralize zero-width and null byte evasion characters
    const cleanMessage = message.replace(/[\u200B-\u200D\uFEFF\0]/g, "");
    for (const item of PROHIBITED_DEBIT_PATTERNS) {
        if (item.pattern.test(cleanMessage)) {
            return {
                isDebit: true,
                matchedPattern: item.name,
                reason: `Message matched prohibited debit pattern: '${item.name}'`
            };
        }
    }
    return { isDebit: false };
}
//# sourceMappingURL=blacklist.js.map