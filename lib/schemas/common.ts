/**
 * lib/schemas/common.ts — Shared Zod primitives.
 *
 * Reusable atoms (coordinates, address, pagination params) that
 * multiple domain schemas compose. Keep this file lean — if a
 * type is only used in one domain, define it in that domain file.
 */

// TODO: uncomment once zod is installed
// import { z } from "zod";
//
// export const coordinatesSchema = z.object({
//   lat: z.number().min(-90).max(90),
//   lng: z.number().min(-180).max(180),
// });
//
// export const addressSchema = z.object({
//   line1: z.string().min(1),
//   line2: z.string().optional(),
//   suburb: z.string().min(1),
//   state: z.string().length(3),         // e.g. "NSW"
//   postcode: z.string().regex(/^\d{4}$/),
//   coordinates: coordinatesSchema.optional(),
// });
//
// export const paginationSchema = z.object({
//   page: z.coerce.number().int().positive().default(1),
//   perPage: z.coerce.number().int().min(1).max(100).default(20),
// });
//
// export type Coordinates = z.infer<typeof coordinatesSchema>;
// export type Address = z.infer<typeof addressSchema>;

export {};
