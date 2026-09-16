/**
 * Converts a decimal BDT currency amount into integer minor units (paisa).
 * Prevents floating-point rounding errors in database storage and arithmetic.
 */
export declare function toPaisa(bdtAmount: number): number;
/**
 * Converts minor currency units (paisa) into decimal BDT.
 */
export declare function fromPaisa(paisa: number): number;
/**
 * Formats a currency amount into standard Bangladeshi Taka presentation (৳1,250.00).
 */
export declare function formatBDT(amount: number): string;
//# sourceMappingURL=currency.d.ts.map