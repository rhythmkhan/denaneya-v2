import { z } from "zod";
export declare const gatewayConfigSchema: z.ZodObject<{
    channel_name: z.ZodString;
    category: z.ZodEnum<["Mobile", "International", "Bank", "Manual"]>;
    account_type: z.ZodEnum<["personal", "merchant", "agent", "current", "savings", "bank"]>;
    account_number: z.ZodString;
    routing_number: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    branch_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    district: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    ussd_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fee_percentage: z.ZodDefault<z.ZodNumber>;
    fee_fixed: z.ZodDefault<z.ZodNumber>;
    exchange_rate: z.ZodDefault<z.ZodNumber>;
    fields_json: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    status: z.ZodDefault<z.ZodEnum<["active", "disabled"]>>;
}, "strip", z.ZodTypeAny, {
    status: "disabled" | "active";
    account_number: string;
    account_type: "agent" | "current" | "merchant" | "personal" | "savings" | "bank";
    fee_percentage: number;
    fee_fixed: number;
    exchange_rate: number;
    channel_name: string;
    category: "Mobile" | "International" | "Bank" | "Manual";
    routing_number?: string | null | undefined;
    branch_name?: string | null | undefined;
    district?: string | null | undefined;
    ussd_code?: string | null | undefined;
    fields_json?: Record<string, unknown> | null | undefined;
}, {
    account_number: string;
    account_type: "agent" | "current" | "merchant" | "personal" | "savings" | "bank";
    channel_name: string;
    category: "Mobile" | "International" | "Bank" | "Manual";
    status?: "disabled" | "active" | undefined;
    fee_percentage?: number | undefined;
    fee_fixed?: number | undefined;
    exchange_rate?: number | undefined;
    routing_number?: string | null | undefined;
    branch_name?: string | null | undefined;
    district?: string | null | undefined;
    ussd_code?: string | null | undefined;
    fields_json?: Record<string, unknown> | null | undefined;
}>;
export type GatewayConfigInput = z.infer<typeof gatewayConfigSchema>;
//# sourceMappingURL=gateway.d.ts.map