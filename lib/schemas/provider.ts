/**
 * lib/schemas/provider.ts — Zod schemas for service providers.
 *
 * Covers both Care and Transport provider types.
 * serviceTypes is an enum array to enforce valid NDIS line items.
 */

// TODO: uncomment once zod is installed
// import { z } from "zod";
// import { addressSchema } from "./common";
//
// export const serviceTypeEnum = z.enum([
//   "personal_care",
//   "community_access",
//   "transport",
//   "therapy",
//   "plan_management",
// ]);
//
// export const createProviderSchema = z.object({
//   name: z.string().min(1).max(300),
//   abn: z.string().regex(/^\d{11}$/).optional(),
//   serviceTypes: z.array(serviceTypeEnum).min(1),
//   address: addressSchema,
//   contactEmail: z.string().email().optional(),
//   contactPhone: z.string().optional(),
// });
//
// export const updateProviderSchema = createProviderSchema.partial();
//
// export type CreateProviderInput = z.infer<typeof createProviderSchema>;
// export type ServiceType = z.infer<typeof serviceTypeEnum>;

export {};
