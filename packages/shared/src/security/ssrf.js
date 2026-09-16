import dns from "dns/promises";
import net from "net";
import https from "https";
/**
 * Checks whether an IPv4 address (represented as 4 numerical octets)
 * falls into any private, loopback, link-local, multicast, or reserved subnet.
 */
export function isProhibitedIPv4Bytes(a, b, c, _d) {
    // 0.0.0.0/8 - This host on this network (RFC 1122)
    if (a === 0)
        return true;
    // 10.0.0.0/8 - RFC 1918 Private
    if (a === 10)
        return true;
    // 100.64.0.0/10 - Shared Address Space / CGNAT (RFC 6598)
    if (a === 100 && b >= 64 && b <= 127)
        return true;
    // 127.0.0.0/8 - Loopback (RFC 1122)
    if (a === 127)
        return true;
    // 169.254.0.0/16 - Link-Local / Cloud Metadata (RFC 3927)
    if (a === 169 && b === 254)
        return true;
    // 172.16.0.0/12 - RFC 1918 Private (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    // 192.0.0.0/24 - IETF Protocol Assignments (RFC 6890)
    if (a === 192 && b === 0 && c === 0)
        return true;
    // 192.0.2.0/24 - TEST-NET-1 Documentation (RFC 5737)
    if (a === 192 && b === 0 && c === 2)
        return true;
    // 192.88.99.0/24 - 6to4 Relay Anycast (RFC 7526 deprecated)
    if (a === 192 && b === 88 && c === 99)
        return true;
    // 192.168.0.0/16 - RFC 1918 Private
    if (a === 192 && b === 168)
        return true;
    // 198.18.0.0/15 - Network Interconnect Benchmark (RFC 2544)
    if (a === 198 && (b === 18 || b === 19))
        return true;
    // 198.51.100.0/24 - TEST-NET-2 Documentation (RFC 5737)
    if (a === 198 && b === 51 && c === 100)
        return true;
    // 203.0.113.0/24 - TEST-NET-3 Documentation (RFC 5737)
    if (a === 203 && b === 0 && c === 113)
        return true;
    // 224.0.0.0/4 - Multicast (RFC 5771)
    if (a >= 224 && a <= 239)
        return true;
    // 240.0.0.0/4 - Reserved & Broadcast (RFC 1112)
    if (a >= 240)
        return true;
    return false;
}
/**
 * Parses any valid RFC 4291 / RFC 5952 IPv6 address into its canonical 16-byte representation.
 * Supports zero compression (::), dual IPv4 notation (::ffff:127.0.0.1), and hex notation.
 * Returns null if the address is malformed.
 */
export function parseIPv6ToBytes(ip) {
    if (!ip || typeof ip !== "string")
        return null;
    let s = ip.trim().toLowerCase();
    // Strip scope ID (e.g. fe80::1%eth0)
    const percentIdx = s.indexOf("%");
    if (percentIdx !== -1) {
        s = s.slice(0, percentIdx);
    }
    // Strip surrounding brackets if present
    if (s.startsWith("[") && s.endsWith("]")) {
        s = s.slice(1, -1);
    }
    // Extract trailing IPv4 dotted-decimal part if present (e.g. ::ffff:127.0.0.1 or 64:ff9b::127.0.0.1)
    let v4Bytes = null;
    let baseStr = s;
    const lastColon = s.lastIndexOf(":");
    if (lastColon !== -1) {
        const candidateV4 = s.slice(lastColon + 1);
        if (candidateV4.includes(".")) {
            const parts = candidateV4.split(".");
            if (parts.length !== 4)
                return null;
            const parsed = [];
            for (const p of parts) {
                if (!/^\d{1,3}$/.test(p))
                    return null;
                if (p.length > 1 && p.startsWith("0"))
                    return null; // Reject octal ambiguity
                const n = parseInt(p, 10);
                if (n < 0 || n > 255)
                    return null;
                parsed.push(n);
            }
            v4Bytes = parsed;
            // Preserve "::" if lastColon was part of a double colon
            if (lastColon > 0 && s[lastColon - 1] === ":") {
                baseStr = s.slice(0, lastColon + 1);
            }
            else {
                baseStr = s.slice(0, lastColon);
            }
        }
    }
    let leftParts = [];
    let rightParts = [];
    const doubleColonIdx = baseStr.indexOf("::");
    if (doubleColonIdx !== -1) {
        // Only one double colon allowed
        if (baseStr.indexOf("::", doubleColonIdx + 2) !== -1)
            return null;
        const left = baseStr.slice(0, doubleColonIdx);
        const right = baseStr.slice(doubleColonIdx + 2);
        if (left.length > 0) {
            leftParts = left.split(":");
        }
        if (right.length > 0) {
            rightParts = right.split(":");
        }
    }
    else {
        leftParts = baseStr.split(":");
    }
    // With embedded IPv4, remaining groups must equal 6; otherwise 8
    const expectedTotalGroups = v4Bytes ? 6 : 8;
    const specifiedGroups = leftParts.length + rightParts.length;
    if (doubleColonIdx === -1) {
        if (specifiedGroups !== expectedTotalGroups)
            return null;
    }
    else {
        if (specifiedGroups > expectedTotalGroups)
            return null;
    }
    const missingGroups = expectedTotalGroups - specifiedGroups;
    const groups = [];
    for (const p of leftParts) {
        if (!/^[0-9a-f]{1,4}$/.test(p))
            return null;
        groups.push(parseInt(p, 16));
    }
    for (let i = 0; i < missingGroups; i++) {
        groups.push(0);
    }
    for (const p of rightParts) {
        if (!/^[0-9a-f]{1,4}$/.test(p))
            return null;
        groups.push(parseInt(p, 16));
    }
    const bytes = new Uint8Array(16);
    for (let i = 0; i < groups.length; i++) {
        bytes[i * 2] = (groups[i] >> 8) & 0xff;
        bytes[i * 2 + 1] = groups[i] & 0xff;
    }
    if (v4Bytes) {
        bytes[12] = v4Bytes[0];
        bytes[13] = v4Bytes[1];
        bytes[14] = v4Bytes[2];
        bytes[15] = v4Bytes[3];
    }
    return bytes;
}
/**
 * Validates whether an IPv4 or IPv6 address belongs to a prohibited/internal subnet.
 * Robustly normalizes all representations: standard IPv4, octal/hex rejection,
 * IPv4-mapped IPv6 (both hex and dotted), uncompressed IPv6, NAT64 (RFC 6052),
 * IPv4-compatible (RFC 4291), 6to4 (RFC 3056), and cloud metadata.
 * Returns true if prohibited; false if safe/public.
 */
export function isProhibitedIP(ip) {
    if (!ip || typeof ip !== "string")
        return true;
    let cleanIP = ip.trim();
    if (cleanIP.startsWith("[") && cleanIP.endsWith("]")) {
        cleanIP = cleanIP.slice(1, -1);
    }
    // Handle standard IPv4 dotted decimal
    const v4Match = cleanIP.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4Match) {
        for (let i = 1; i <= 4; i++) {
            const part = v4Match[i];
            // Strict rejection of leading zeros (e.g. 0177.0.0.1) to avoid octal confusion
            if (part.length > 1 && part.startsWith("0"))
                return true;
        }
        const a = parseInt(v4Match[1], 10);
        const b = parseInt(v4Match[2], 10);
        const c = parseInt(v4Match[3], 10);
        const d = parseInt(v4Match[4], 10);
        if (a > 255 || b > 255 || c > 255 || d > 255)
            return true;
        return isProhibitedIPv4Bytes(a, b, c, d);
    }
    // Handle IPv6 via 16-byte binary normalization
    const bytes = parseIPv6ToBytes(cleanIP);
    if (bytes) {
        // 1. Unspecified ::/128
        if (bytes.every((b) => b === 0))
            return true;
        // 2. Loopback ::1/128
        if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1)
            return true;
        // 3. IPv4-mapped IPv6 ::ffff:0:0/96 (covers ::ffff:127.0.0.1, ::ffff:7f00:1, ::ffff:a9fe:a9fe, uncompressed)
        if (bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
            return isProhibitedIPv4Bytes(bytes[12], bytes[13], bytes[14], bytes[15]);
        }
        // 4. IPv4-compatible IPv6 ::/96 (RFC 4291 deprecated, covers ::127.0.0.1, ::7f00:1)
        if (bytes.slice(0, 12).every((b) => b === 0)) {
            return isProhibitedIPv4Bytes(bytes[12], bytes[13], bytes[14], bytes[15]);
        }
        // 5. NAT64 Well-Known Prefix 64:ff9b::/96 (RFC 6052, covers 64:ff9b::127.0.0.1, 64:ff9b::a9fe:a9fe)
        if (bytes[0] === 0x00 &&
            bytes[1] === 0x64 &&
            bytes[2] === 0xff &&
            bytes[3] === 0x9b &&
            bytes.slice(4, 12).every((b) => b === 0)) {
            return isProhibitedIPv4Bytes(bytes[12], bytes[13], bytes[14], bytes[15]);
        }
        // 6. NAT64 Local-Use Translation Prefix 64:ff9b:1::/48 (RFC 8215)
        if (bytes[0] === 0x00 &&
            bytes[1] === 0x64 &&
            bytes[2] === 0xff &&
            bytes[3] === 0x9b &&
            bytes[4] === 0x00 &&
            bytes[5] === 0x01) {
            return true; // Local translation prefix is prohibited
        }
        // 7. 6to4 2002::/16 (RFC 3056) - embeds IPv4 in bytes 2-5
        if (bytes[0] === 0x20 && bytes[1] === 0x02) {
            return isProhibitedIPv4Bytes(bytes[2], bytes[3], bytes[4], bytes[5]);
        }
        // 8. Teredo 2001:0000::/32 (RFC 4380) - embeds server IPv4 (4-7) and negated client IPv4 (12-15)
        if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) {
            if (isProhibitedIPv4Bytes(bytes[4], bytes[5], bytes[6], bytes[7]))
                return true;
            if (isProhibitedIPv4Bytes(bytes[12] ^ 0xff, bytes[13] ^ 0xff, bytes[14] ^ 0xff, bytes[15] ^ 0xff)) {
                return true;
            }
        }
        // 9. Link-Local unicast fe80::/10 (RFC 4291)
        if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80)
            return true;
        // 10. Unique Local Unicast fc00::/7 (RFC 4193 ULA, fc00..fdff)
        if ((bytes[0] & 0xfe) === 0xfc)
            return true;
        // 11. Multicast ff00::/8 (RFC 4291)
        if (bytes[0] === 0xff)
            return true;
        // 12. Discard prefix 100::/64 (RFC 6666)
        if (bytes[0] === 0x01 && bytes[1] === 0x00 && bytes.slice(2, 8).every((b) => b === 0)) {
            return true;
        }
        // 13. Documentation 2001:db8::/32 (RFC 3849)
        if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) {
            return true;
        }
        // 14. Benchmarking 2001:2::/48 (RFC 5180)
        if (bytes[0] === 0x20 &&
            bytes[1] === 0x01 &&
            bytes[2] === 0x00 &&
            bytes[3] === 0x02 &&
            bytes[4] === 0 &&
            bytes[5] === 0) {
            return true;
        }
        // 15. ORCHID / ORCHIDv2 2001:10::/28, 2001:20::/28 (RFC 4843, RFC 7343)
        if (bytes[0] === 0x20 &&
            bytes[1] === 0x01 &&
            bytes[2] === 0x00 &&
            ((bytes[3] & 0xf0) === 0x10 || (bytes[3] & 0xf0) === 0x20)) {
            return true;
        }
        return false;
    }
    // Non-canonical formats (octal 0177.0.0.1, hex 0x7f000001, dword 2130706433, or invalid strings) -> block
    return true;
}
/**
 * Checks whether a given IP address or hostname represents a loopback address
 * (127.0.0.0/8, ::1, ::ffff:127.0.0.1, or localhost).
 */
export function isLoopbackAddress(hostOrIp) {
    if (!hostOrIp || typeof hostOrIp !== "string")
        return false;
    let clean = hostOrIp.trim().toLowerCase();
    if (clean.startsWith("[") && clean.endsWith("]")) {
        clean = clean.slice(1, -1);
    }
    if (clean === "localhost" || clean.endsWith(".localhost")) {
        return true;
    }
    // IPv4 dotted-decimal loopback (127.0.0.0/8)
    const v4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4Match) {
        const a = parseInt(v4Match[1], 10);
        return a === 127;
    }
    // IPv6 loopback and IPv4-mapped loopback
    const bytes = parseIPv6ToBytes(clean);
    if (bytes) {
        // ::1/128 loopback
        if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) {
            return true;
        }
        // IPv4-mapped loopback ::ffff:127.0.0.0/104
        if (bytes.slice(0, 10).every((b) => b === 0) &&
            bytes[10] === 0xff &&
            bytes[11] === 0xff &&
            bytes[12] === 127) {
            return true;
        }
        // IPv4-compatible loopback ::127.0.0.0/104 (deprecated RFC 4291)
        if (bytes.slice(0, 12).every((b) => b === 0) && bytes[12] === 127) {
            return true;
        }
    }
    return false;
}
/**
 * Validates a target webhook URL for SSRF vulnerabilities.
 * Resolves DNS hostnames and verifies all resolved IP addresses against private subnets.
 * Returns the first validated IP address for socket pinning.
 */
export async function validateWebhookUrl(targetUrl, options = {}) {
    let parsed;
    try {
        parsed = new URL(targetUrl);
    }
    catch {
        return { valid: false, error: "INVALID_URL_FORMAT" };
    }
    // Reject unsupported protocols immediately
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { valid: false, error: "UNSUPPORTED_PROTOCOL" };
    }
    const rawHost = parsed.hostname;
    if (!rawHost) {
        return { valid: false, error: "MISSING_HOSTNAME" };
    }
    // Strip brackets from IPv6 hostnames (e.g. "[::1]" -> "::1")
    const cleanHost = rawHost.startsWith("[") && rawHost.endsWith("]") ? rawHost.slice(1, -1) : rawHost;
    const isLocalhost = cleanHost.toLowerCase() === "localhost" || cleanHost.toLowerCase().endsWith(".localhost");
    // 1. Hostname is localhost
    if (isLocalhost) {
        if (!options.allowHttpForTesting) {
            return { valid: false, error: "SSRF_BLOCKED_PRIVATE_IP: localhost" };
        }
        return {
            valid: true,
            pinnedAddress: "127.0.0.1",
            ipFamily: 4
        };
    }
    // Known cloud metadata hostnames
    const lowerHost = cleanHost.toLowerCase();
    if (lowerHost === "instance-data" ||
        lowerHost === "metadata.google.internal" ||
        lowerHost === "instance-data.ec2.internal" ||
        lowerHost === "metadata") {
        return { valid: false, error: `SSRF_BLOCKED_PRIVATE_IP: ${cleanHost}` };
    }
    // 2. Hostname is directly an IP literal (IPv4, IPv6, octal, or hex representations)
    const isIpLiteral = net.isIP(cleanHost) !== 0 ||
        parseIPv6ToBytes(cleanHost) !== null ||
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost);
    if (isIpLiteral) {
        if (isProhibitedIP(cleanHost)) {
            const isLoopback = isLoopbackAddress(cleanHost);
            if (!(options.allowHttpForTesting && isLoopback)) {
                return { valid: false, error: `SSRF_BLOCKED_PRIVATE_IP: ${cleanHost}` };
            }
        }
        // IP address is either safe public or permitted loopback in testing mode.
        // In production, enforce HTTPS.
        if (!options.allowHttpForTesting && parsed.protocol !== "https:") {
            return { valid: false, error: "PROTOCOL_NOT_HTTPS" };
        }
        return {
            valid: true,
            pinnedAddress: cleanHost,
            ipFamily: net.isIPv4(cleanHost) ? 4 : 6
        };
    }
    // 3. Pre-flight DNS resolution for domain names
    try {
        const records = await dns.lookup(cleanHost, { all: true });
        if (!records || records.length === 0) {
            if (!options.allowHttpForTesting && parsed.protocol !== "https:") {
                return { valid: false, error: "PROTOCOL_NOT_HTTPS" };
            }
            return { valid: false, error: "DNS_RESOLUTION_FAILED" };
        }
        // Verify all resolved IP records against prohibited subnets BEFORE protocol check
        for (const rec of records) {
            if (isProhibitedIP(rec.address)) {
                const isLoopback = isLoopbackAddress(rec.address);
                if (!(options.allowHttpForTesting && isLoopback)) {
                    return { valid: false, error: `SSRF_BLOCKED_PRIVATE_IP: ${rec.address}` };
                }
            }
        }
        // All resolved IP records are safe / public. Enforce HTTPS in production.
        if (!options.allowHttpForTesting && parsed.protocol !== "https:") {
            return { valid: false, error: "PROTOCOL_NOT_HTTPS" };
        }
        return {
            valid: true,
            pinnedAddress: records[0].address,
            ipFamily: records[0].family
        };
    }
    catch (err) {
        if (!options.allowHttpForTesting && parsed.protocol !== "https:") {
            return { valid: false, error: "PROTOCOL_NOT_HTTPS" };
        }
        return { valid: false, error: `DNS_LOOKUP_ERROR: ${err.message}` };
    }
}
/**
 * Creates an HTTPS Agent with socket IP pinning to prevent DNS rebinding attacks.
 */
export function createPinnedHttpsAgent(pinnedIp, ipFamily) {
    return new https.Agent({
        keepAlive: false,
        lookup: (_hostname, opts, cb) => {
            if (typeof opts === "function") {
                cb = opts;
            }
            cb(null, pinnedIp, ipFamily);
        }
    });
}
//# sourceMappingURL=ssrf.js.map