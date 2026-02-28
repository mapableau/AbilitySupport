/**
 * lib/workflows/events.ts — Inngest event type definitions.
 *
 * Typed event map consumed by the Inngest client for end-to-end
 * type safety between event senders and step function handlers.
 *
 * Convention: event names use "domain/verb" format.
 */

export interface MapAbleEvents {
  "booking/created": {
    data: {
      bookingId: string;
      participantId: string;
      providerId: string;
    };
  };
  "booking/cancelled": {
    data: {
      bookingId: string;
      participantId: string;
      reason?: string;
    };
  };
  "search/reindex": {
    data: {
      collection: "providers" | "participants";
      mode: "full" | "delta";
    };
  };
  "risk/recalculate": {
    data: {
      participantId: string;
    };
  };
  "provider/updated": {
    data: {
      providerId: string;
    };
  };
}
