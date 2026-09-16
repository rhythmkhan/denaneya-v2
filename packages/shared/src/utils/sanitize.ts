/**
 * Basic context-aware string sanitization for customer names, notes, and metadata.
 * Escapes characters that present Cross-Site Scripting (XSS) risks.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
