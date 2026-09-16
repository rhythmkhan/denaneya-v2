import { z } from "zod";
export const webhookEventSchema = z.object({
    event: z.enum(["invoice.completed", "invoice.expired", "invoice.created"]),
    brand_id: z.string().min(1),
    invoice_id: z.string().min(1),
    amount: z.number().positive(),
    amount_paisa: z.number().int().positive(),
    trx_id: z.string().optional().nullable(),
    payment_method: z.string().optional().nullable(),
    customer_phone: z.string().optional().nullable(),
    timestamp: z.number().int().positive(),
    metadata: z.record(z.unknown()).optional().nullable()
});
//# sourceMappingURL=webhook.js.map