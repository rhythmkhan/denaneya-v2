import { resolveProviderFromSender, isTelecomSenderWhitelisted } from "../constants/telecom.js";
import { checkDebitBlacklist } from "../constants/blacklist.js";
import { parseBkashSms } from "./bkash.js";
import { parseNagadSms } from "./nagad.js";
import { parseRocketSms } from "./rocket.js";
import { parseUpaySms } from "./upay.js";
/**
 * Comprehensive parser pipeline for carrier SMS ingestion.
 * Steps:
 * 1. Checks originating sender against Telecom Whitelist (VULN-02).
 * 2. Checks message body against Debit Keyword Blacklist (VULN-05).
 * 3. Routes message to provider-specific parser.
 * 4. Normalizes monetary value to minor units (paisa).
 */
export function parseIncomingSms(sender, rawMessage) {
    if (!sender || !rawMessage || typeof rawMessage !== "string") {
        return { success: false, error: "EMPTY_PAYLOAD", message: "Missing sender address or message body." };
    }
    // 1. Telecom Whitelist Enforcement
    if (!isTelecomSenderWhitelisted(sender)) {
        return {
            success: false,
            error: "UNAUTHORIZED_SENDER",
            message: `Originating sender '${sender}' is not authorized. Must be an authentic telecom mask.`
        };
    }
    // 2. Debit Keyword Blacklist Enforcement
    const debitCheck = checkDebitBlacklist(rawMessage);
    if (debitCheck.isDebit) {
        return {
            success: false,
            error: "DEBIT_TRANSACTION_REJECTED",
            message: `Message rejected: detected debit or withdrawal event (${debitCheck.matchedPattern}).`
        };
    }
    const provider = resolveProviderFromSender(sender);
    if (!provider) {
        return { success: false, error: "UNKNOWN_PROVIDER", message: "Unable to map sender to provider." };
    }
    // 3. Provider-Specific Extraction
    let parsed = null;
    switch (provider) {
        case "bKash":
            parsed = parseBkashSms(rawMessage);
            break;
        case "Nagad":
            parsed = parseNagadSms(rawMessage);
            break;
        case "Rocket":
            parsed = parseRocketSms(rawMessage);
            break;
        case "Upay":
            parsed = parseUpaySms(rawMessage);
            break;
    }
    if (!parsed) {
        return {
            success: false,
            error: "PARSING_FAILED",
            message: `Message failed directional credit parsing for provider ${provider}.`
        };
    }
    return {
        success: true,
        data: parsed
    };
}
//# sourceMappingURL=parser.js.map