import { z } from "zod";
import { bdMobileRegex } from "./invoice.js";

export const paymentSubmissionSchema = z.object({
  invoice_id: z
    .string()
    .trim()
    .min(1, "Invoice ID is required.")
    .max(64, "Invoice ID cannot exceed 64 characters."),
  trx_id: z
    .string()
    .trim()
    .min(6, "Transaction ID must be at least 6 characters.")
    .max(32, "Transaction ID cannot exceed 32 characters.")
    .regex(/^[A-Za-z0-9_-]+$/, "Transaction ID contains invalid characters.")
    .transform((val) => val.toUpperCase()),
  customer_phone: z
    .string()
    .regex(bdMobileRegex, "Phone must be a valid 11-digit mobile number.")
    .optional()
});

export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
