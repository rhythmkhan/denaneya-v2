import { z } from "zod";

export const bdMobileRegex = /^01[3-9]\d{8}$/;

export const invoiceCreateSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a numeric value." })
    .positive("Amount must be greater than zero.")
    .finite("Amount must be a finite number.")
    .min(1.0, "Minimum invoice amount is ৳1.00.")
    .max(500000.0, "Maximum invoice amount is ৳500,000.00.")
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: "Amount must not have more than 2 decimal places."
    }),
  customer_name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(100, "Customer name cannot exceed 100 characters.")
    // Prevent Stored XSS
    .transform((val) => val.replace(/[<>]/g, "")),
  customer_email: z
    .string()
    .email("Invalid customer email address.")
    .max(255)
    .optional()
    .or(z.literal("")),
  customer_phone: z
    .string()
    .regex(bdMobileRegex, "Customer phone must be an 11-digit Bangladeshi mobile number (e.g. 01712345678).")
    .optional()
    .or(z.literal("")),
  redirect_url: z
    .string()
    .url("Redirect URL must be a valid URL.")
    .refine((u) => u.startsWith("https://") || u.startsWith("http://localhost"), {
      message: "Redirect URL must use HTTPS."
    })
    .optional(),
  cancel_url: z
    .string()
    .url("Cancel URL must be a valid URL.")
    .refine((u) => u.startsWith("https://") || u.startsWith("http://localhost"), {
      message: "Cancel URL must use HTTPS."
    })
    .optional(),
  webhook_url: z
    .string()
    .url("Webhook URL must be a valid URL.")
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS."
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  // 15-Minute Expiration Window (Mandatory VULN-10)
  ttl_minutes: z.number().int().min(5).max(60).default(15)
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
