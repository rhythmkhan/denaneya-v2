/**
 * Recursively canonicalizes a JSON value to produce deterministic string output
 * conforming to RFC 8785 (JSON Canonicalization Scheme).
 *
 * Guarantees:
 * 1. Object keys are sorted lexicographically by UTF-16 code units.
 * 2. Object properties with `undefined`, function, or symbol values are omitted.
 * 3. Array elements with `undefined`, function, or symbol values serialize as `null`.
 * 4. Objects implementing `toJSON()` (e.g. Date) are correctly transformed.
 * 5. Deterministic string output is guaranteed across all environments.
 */
export function canonicalizeJson(val: unknown): string {
  // Handle top-level non-serializable values
  if (val === undefined || typeof val === "function" || typeof val === "symbol") {
    return "";
  }

  // Honor custom toJSON() implementations (e.g. Date -> ISO string)
  if (val !== null && typeof val === "object" && typeof (val as { toJSON?: unknown }).toJSON === "function") {
    return canonicalizeJson((val as { toJSON: () => unknown }).toJSON());
  }

  // Handle primitives and null
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val) ?? "";
  }

  // Handle Arrays: undefined/function/symbol elements become null
  if (Array.isArray(val)) {
    return (
      "[" +
      val
        .map((item) => {
          if (item === undefined || typeof item === "function" || typeof item === "symbol") {
            return "null";
          }
          return canonicalizeJson(item);
        })
        .join(",") +
      "]"
    );
  }

  // Handle Objects: filter out undefined, functions, symbols, and sort keys lexicographically
  const obj = val as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => {
      const v = obj[k];
      return v !== undefined && typeof v !== "function" && typeof v !== "symbol";
    })
    .sort();

  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalizeJson(obj[k])).join(",") +
    "}"
  );
}
