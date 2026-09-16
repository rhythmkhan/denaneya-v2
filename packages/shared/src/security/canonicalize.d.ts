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
export declare function canonicalizeJson(val: unknown): string;
//# sourceMappingURL=canonicalize.d.ts.map