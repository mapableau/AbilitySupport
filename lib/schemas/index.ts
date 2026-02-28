/**
 * lib/schemas — Zod validation schemas shared between server and client.
 *
 * Convention: one file per domain entity, re-exported here.
 * Shared primitives (address, coordinates, pagination) live in common.ts.
 *
 * Usage:
 *   import { createParticipantSchema, type CreateParticipantInput } from "@/lib/schemas";
 */

export * from "./common";
export * from "./participant";
export * from "./provider";
export * from "./booking";
