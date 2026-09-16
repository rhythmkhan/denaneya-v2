import { z } from "zod";
export declare const bdMobileRegex: RegExp;
export declare const invoiceCreateSchema: z.ZodObject<{
    amount: z.ZodEffects<z.ZodNumber, number, number>;
    customer_name: z.ZodEffects<z.ZodString, string, string>;
    customer_email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    customer_phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    redirect_url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    cancel_url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    webhook_url: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    ttl_minutes: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    customer_name: string;
    amount: number;
    ttl_minutes: number;
    metadata?: Record<string, unknown> | undefined;
    customer_phone?: string | undefined;
    customer_email?: string | undefined;
    redirect_url?: string | undefined;
    cancel_url?: string | undefined;
    webhook_url?: string | undefined;
}, {
    customer_name: string;
    amount: number;
    metadata?: Record<string, unknown> | undefined;
    customer_phone?: string | undefined;
    customer_email?: string | undefined;
    redirect_url?: string | undefined;
    ttl_minutes?: number | undefined;
    cancel_url?: string | undefined;
    webhook_url?: string | undefined;
}>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
//# sourceMappingURL=invoice.d.ts.map