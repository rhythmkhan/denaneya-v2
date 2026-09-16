/**
 * Converts a decimal BDT currency amount into integer minor units (paisa).
 * Prevents floating-point rounding errors in database storage and arithmetic.
 */
export function toPaisa(bdtAmount: number): number {
  if (!Number.isFinite(bdtAmount)) {
    throw new Error("Cannot convert non-finite number to paisa.");
  }
  return Math.round(bdtAmount * 100);
}

/**
 * Converts minor currency units (paisa) into decimal BDT.
 */
export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

/**
 * Formats a currency amount into standard Bangladeshi Taka presentation (৳1,250.00).
 */
export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(amount)
    .replace("BDT", "৳");
}
