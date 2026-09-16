import { z } from "zod";
import { isTelecomSenderWhitelisted } from "../constants/telecom.js";
export const deviceSyncPayloadSchema = z.object({
    sender: z
        .string()
        .trim()
        .min(1, "Sender address is required.")
        .max(32, "Sender address exceeds maximum length.")
        .refine(isTelecomSenderWhitelisted, {
        message: "Sender must match an authorized telecom mask (bKash, 16216, Nagad, 16222, Upay)."
    }),
    message: z
        .string()
        .trim()
        .min(5, "SMS message body is too short.")
        .max(1000, "SMS message body exceeds 1000 characters."),
    sim_slot: z.union([z.literal(1), z.literal(2)]).default(1),
    timestamp: z.string().datetime().optional()
});
//# sourceMappingURL=deviceSync.js.map