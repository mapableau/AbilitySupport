/**
 * lib/workflows/followups.ts — Inngest workflows for post-service follow-ups.
 *
 * Flow:
 *   1. booking/completed → schedule a check-in followup (delayed 2h)
 *   2. followup/response_received → analyse signals →
 *      if negative: create escalation + lower provider confidence
 *
 * All functions are idempotent. Inngest retries on failure.
 */

import { inngest } from "./inngest/client.js";
import {
  getBooking,
  createFollowup,
  createEscalation,
  lowerProviderConfidence,
  getSystemUserId,
} from "../followups/data.js";

// ── booking/completed → schedule followup ──────────────────────────────────

export const onBookingCompleted = inngest.createFunction(
  {
    id: "followup-on-booking-completed",
    name: "Followup: Booking Completed",
    retries: 3,
    concurrency: [{ limit: 10 }],
  },
  { event: "booking/completed" },
  async ({ event, step, logger }) => {
    const { bookingId, participantId, organisationId, workerId } = event.data;
    logger.info("Booking completed — scheduling followup", {
      bookingId,
      participantId,
    });

    await step.sleep("wait-before-followup", "2h");

    const booking = await step.run("load-booking", () => getBooking(bookingId));

    if (!booking) {
      logger.warn("Booking not found after sleep — may have been deleted", { bookingId });
      return { bookingId, followupCreated: false, reason: "booking_not_found" };
    }

    const followup = await step.run("create-check-in", () =>
      createFollowup({
        bookingId,
        createdBy: getSystemUserId(),
        followupType: "check_in",
        priority: "normal",
        summary: "How was your recent service?",
        details: `Automated check-in for booking ${bookingId}. ` +
          `Please rate your experience and let us know if anything needs attention.`,
      }),
    );

    await step.run("emit-followup-created", () =>
      inngest.send({
        name: "followup/created",
        data: {
          followupId: followup.id,
          bookingId,
          followupType: "check_in",
        },
      }),
    );

    logger.info("Followup created", {
      followupId: followup.id,
      bookingId,
    });

    return {
      bookingId,
      followupCreated: true,
      followupId: followup.id,
    };
  },
);

// ── followup/response_received → analyse + escalate ────────────────────────

export const onFollowupResponseReceived = inngest.createFunction(
  {
    id: "followup-response-handler",
    name: "Followup: Response Handler",
    retries: 3,
    concurrency: [{ limit: 10 }],
  },
  { event: "followup/response_received" },
  async ({ event, step, logger }) => {
    const { followupId, bookingId, sentiment, hasAccessibilityMismatch } = event.data;
    logger.info("Followup response received", {
      followupId,
      bookingId,
      sentiment,
      hasAccessibilityMismatch,
    });

    const isNegative = sentiment === "negative";
    const requiresEscalation = isNegative || hasAccessibilityMismatch;

    if (!requiresEscalation) {
      logger.info("Positive/neutral feedback — no escalation needed", { followupId });
      return {
        followupId,
        bookingId,
        escalated: false,
        sentiment,
      };
    }

    const booking = await step.run("load-booking", () => getBooking(bookingId));

    const reasons: string[] = [];
    if (isNegative) reasons.push("Negative participant feedback");
    if (hasAccessibilityMismatch) reasons.push("Accessibility mismatch reported");

    const escalation = await step.run("create-escalation", () =>
      createEscalation({
        bookingId,
        coordinatorSystemUserId: getSystemUserId(),
        summary: `Escalation: ${reasons.join(" + ")}`,
        details:
          `Followup ${followupId} for booking ${bookingId} received ` +
          `${sentiment} feedback. ` +
          (hasAccessibilityMismatch
            ? "Participant reported an accessibility mismatch. "
            : "") +
          "Coordinator review required.",
        priority: hasAccessibilityMismatch ? "high" : "normal",
      }),
    );

    logger.info("Escalation created", {
      escalationId: escalation.id,
      bookingId,
      reasons,
    });

    if (booking) {
      const decrement = isNegative && hasAccessibilityMismatch ? 15 : 10;

      await step.run("lower-provider-confidence", () =>
        lowerProviderConfidence({
          organisationId: booking.organisationId,
          workerId: booking.workerId ?? undefined,
          reason: reasons.join("; "),
          decrement,
        }),
      );

      logger.info("Provider confidence lowered", {
        organisationId: booking.organisationId,
        workerId: booking.workerId,
        decrement,
      });
    }

    return {
      followupId,
      bookingId,
      escalated: true,
      escalationId: escalation.id,
      sentiment,
      hasAccessibilityMismatch,
    };
  },
);

export const followupFunctions = [
  onBookingCompleted,
  onFollowupResponseReceived,
];
