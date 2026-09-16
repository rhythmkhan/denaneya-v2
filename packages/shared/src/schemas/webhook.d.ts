import { z } from "zod";
export declare const webhookEventSchema: z.ZodObject<{
    event: z.ZodEnum<["invoice.completed", "invoice.expired", "invoice.created"]>;
    brand_id: z.ZodString;
    invoice_id: z.ZodString;
    amount: z.ZodNumber;
    amount_paisa: z.ZodNumber;
    trx_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    payment_method: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customer_phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    timestamp: z.ZodNumber;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    invoice_id: string;
    amount: number;
    event: "invoice.completed" | "invoice.expired" | "invoice.created";
    brand_id: string;
    amount_paisa: number;
    timestamp: number;
    metadata?: Record<string, unknown> | null | undefined;
    customer_phone?: string | null | undefined;
    trx_id?: string | null | undefined;
    payment_method?: string | null | undefined;
}, {
    invoice_id: string;
    amount: number;
    event: "invoice.completed" | "invoice.expired" | "invoice.created";
    brand_id: string;
    amount_paisa: number;
    timestamp: number;
    metadata?: Record<string, unknown> | null | undefined;
    customer_phone?: string | null | undefined;
    trx_id?: string | null | undefined;
    payment_method?: string | null | undefined;
}>;
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;
//# sourceMappingURL=webhook.d.ts.map