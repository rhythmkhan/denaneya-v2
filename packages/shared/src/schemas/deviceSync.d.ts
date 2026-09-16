import { z } from "zod";
export declare const deviceSyncPayloadSchema: z.ZodObject<{
    sender: z.ZodEffects<z.ZodString, string, string>;
    message: z.ZodString;
    sim_slot: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>]>>;
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    sender: string;
    sim_slot: 1 | 2;
    timestamp?: string | undefined;
}, {
    message: string;
    sender: string;
    timestamp?: string | undefined;
    sim_slot?: 1 | 2 | undefined;
}>;
export type DeviceSyncPayload = z.infer<typeof deviceSyncPayloadSchema>;
//# sourceMappingURL=deviceSync.d.ts.map