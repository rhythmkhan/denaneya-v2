import { z } from "zod";
export declare const paymentSubmissionSchema: z.ZodObject<{
    invoice_id: z.ZodString;
    trx_id: z.ZodEffects<z.ZodString, string, string>;
    customer_phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    invoice_id: string;
    trx_id: string;
    customer_phone?: string | undefined;
}, {
    invoice_id: string;
    trx_id: string;
    customer_phone?: string | undefined;
}>;
export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
//# sourceMappingURL=payment.d.ts.map