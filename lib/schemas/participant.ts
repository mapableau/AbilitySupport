/**
 * lib/schemas/participant.ts — Zod schemas for NDIS participants.
 *
 * Used in:
 *   - API route input validation (createParticipant, updateParticipant)
 *   - Form validation on the client (react-hook-form + zodResolver)
 *   - Type inference throughout the app via z.infer<>
 */

// TODO: uncomment once zod is installed
// import { z } from "zod";
// import { addressSchema } from "./common";
//
// export const createParticipantSchema = z.object({
//   fullName: z.string().min(1).max(200),
//   ndisNumber: z.string().regex(/^\d{9}$/).optional(),
//   dateOfBirth: z.coerce.date(),
//   address: addressSchema.optional(),
//   notes: z.string().max(2000).optional(),
// });
//
// export const updateParticipantSchema = createParticipantSchema.partial();
//
// export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
// export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;

export {};
