import {
  listCalendarEvents,
  createCalendarEvent,
  listAvailability,
  seedAvailabilitySlots,
} from "./data";
import * as fs from "fs";
import * as path from "path";

describe("calendar/data", () => {
  it("listCalendarEvents returns empty array from stub", async () => {
    const events = await listCalendarEvents({
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });
    expect(events).toEqual([]);
  });

  it("createCalendarEvent returns a well-formed event", async () => {
    const event = await createCalendarEvent({
      eventType: "booking",
      sourceType: "booking",
      startsAt: new Date("2026-03-01T09:00:00Z"),
      endsAt: new Date("2026-03-01T10:00:00Z"),
      title: "Personal care session",
      status: "confirmed",
    });
    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe("booking");
    expect(event.sourceType).toBe("booking");
    expect(event.title).toBe("Personal care session");
    expect(event.status).toBe("confirmed");
    expect(event.allDay).toBe(false);
  });

  it("createCalendarEvent accepts all optional fields", async () => {
    const event = await createCalendarEvent({
      userId: "user-1",
      organisationId: "org-1",
      workerId: "wrk-1",
      participantProfileId: "pp-1",
      eventType: "availability",
      sourceType: "availability_slot",
      sourceId: "slot-1",
      startsAt: new Date("2026-03-01T08:00:00Z"),
      endsAt: new Date("2026-03-01T17:00:00Z"),
      allDay: false,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      title: "Available",
      description: "Mon/Wed/Fri mornings",
      status: "confirmed",
      color: "#16a34a",
    });
    expect(event.workerId).toBe("wrk-1");
    expect(event.recurrenceRule).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(event.color).toBe("#16a34a");
  });

  it("listAvailability returns empty array from stub", async () => {
    const slots = await listAvailability({
      from: new Date("2026-03-01"),
      to: new Date("2026-03-07"),
      workerId: "wrk-1",
    });
    expect(slots).toEqual([]);
  });

  it("seedAvailabilitySlots returns count of created slots", async () => {
    const result = await seedAvailabilitySlots([
      {
        workerId: "wrk-1",
        startsAt: new Date("2026-03-01T09:00:00Z"),
        endsAt: new Date("2026-03-01T17:00:00Z"),
      },
      {
        workerId: "wrk-1",
        startsAt: new Date("2026-03-02T09:00:00Z"),
        endsAt: new Date("2026-03-02T17:00:00Z"),
        recurrenceRule: "FREQ=WEEKLY",
      },
    ]);
    expect(result.created).toBe(2);
  });
});

// ── Migration validation ───────────────────────────────────────────────────

describe("0006_calendar_events.sql migration", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "../../db/migrations/0006_calendar_events.sql"),
    "utf-8",
  );

  it("creates calendar_events table", () => {
    expect(sql).toContain("CREATE TABLE calendar_events");
  });

  it("has event_type CHECK constraint", () => {
    expect(sql).toContain("'booking'");
    expect(sql).toContain("'availability'");
    expect(sql).toContain("'block'");
    expect(sql).toContain("'hold'");
    expect(sql).toContain("'reminder'");
  });

  it("has source_type CHECK constraint", () => {
    expect(sql).toContain("'availability_slot'");
    expect(sql).toContain("'manual'");
  });

  it("has status CHECK constraint", () => {
    expect(sql).toContain("'tentative'");
    expect(sql).toContain("'confirmed'");
    expect(sql).toContain("'cancelled'");
  });

  it("enables RLS", () => {
    expect(sql).toContain("ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY");
  });

  it("has RLS policies for participant, worker, org, and broad roles", () => {
    expect(sql).toContain("CREATE POLICY cal_events_own_user");
    expect(sql).toContain("CREATE POLICY cal_events_own_participant");
    expect(sql).toContain("CREATE POLICY cal_events_worker");
    expect(sql).toContain("CREATE POLICY cal_events_org");
    expect(sql).toContain("CREATE POLICY cal_events_broad");
  });

  it("has time-range index", () => {
    expect(sql).toContain("idx_cal_events_time_range");
  });

  it("has updated_at trigger", () => {
    expect(sql).toContain("trg_calendar_events_updated_at");
  });
});
