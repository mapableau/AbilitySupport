/**
 * lib/workflows/events.ts — Inngest event type definitions.
 *
 * Typed event map consumed by the Inngest client for end-to-end
 * type safety between event senders and step function handlers.
 *
 * Convention: event names use "domain/verb" format.
 */

// ── Indexing events ────────────────────────────────────────────────────────

export type IndexingEvents = {
  /** Fired when an organisation's profile, service_types, or address changes. */
  "organisation/updated": {
    data: {
      organisationId: string;
    };
  };
  /** Fired when a worker's profile, capabilities, or clearance changes. */
  "worker/updated": {
    data: {
      workerId: string;
      organisationId: string;
    };
  };
  /** Fired when a vehicle is added, removed, or its type/WAV status changes. */
  "vehicle/updated": {
    data: {
      vehicleId: string;
      organisationId: string;
    };
  };
  /** Fired when availability slots are created, updated, or deleted. */
  "availability/updated": {
    data: {
      slotId: string;
      workerId?: string;
      vehicleId?: string;
      organisationId: string;
    };
  };

  // ── Booking lifecycle ───────────────────────────────────────────────

  "booking/created": {
    data: {
      bookingId: string;
      participantId: string;
      organisationId: string;
    };
  };
  "booking/completed": {
    data: {
      bookingId: string;
      participantId: string;
      organisationId: string;
      workerId?: string;
    };
  };
  "booking/cancelled": {
    data: {
      bookingId: string;
      participantId: string;
      reason?: string;
    };
  };

  // ── Follow-up lifecycle ───────────────────────────────────────────────

  "followup/created": {
    data: {
      followupId: string;
      bookingId: string;
      followupType: string;
    };
  };
  "followup/response_received": {
    data: {
      followupId: string;
      bookingId: string;
      sentiment: "positive" | "neutral" | "negative";
      hasAccessibilityMismatch: boolean;
    };
  };

  // ── Search admin ───────────────────────────────────────────────────────

  /** Manually trigger a reindex (e.g. from admin dashboard or CLI). */
  "search/reindex": {
    data: {
      collection: "organisations_search" | "workers_search" | "all";
      mode: "full" | "delta";
    };
  };

  // ── Risk events (reserved) ────────────────────────────────────────────

  "risk/recalculate": {
    data: {
      participantId: string;
    };
  };
};
