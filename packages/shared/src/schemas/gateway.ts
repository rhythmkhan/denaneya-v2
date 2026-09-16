import { z } from "zod";

export const gatewayConfigSchema = z.object({
  channel_name: z.string().min(2).max(64),
  category: z.enum(["Mobile", "International", "Bank", "Manual"]),
  account_type: z.enum(["personal", "merchant", "agent", "current", "savings", "bank"]),
  account_number: z.string().min(3).max(64),
  routing_number: z.string().max(32).optional().nullable(),
  branch_name: z.string().max(128).optional().nullable(),
  district: z.string().max(64).optional().nullable(),
  ussd_code: z.string().max(32).optional().nullable(),
  fee_percentage: z.number().min(0).max(100).default(0),
  fee_fixed: z.number().min(0).default(0),
  exchange_rate: z.number().positive().default(1.0),
  fields_json: z.record(z.unknown()).optional().nullable(),
  status: z.enum(["active", "disabled"]).default("active")
});

export type GatewayConfigInput = z.infer<typeof gatewayConfigSchema>;
