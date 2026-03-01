/**
 * /calendar — Calendar stub showing availability and bookings.
 *
 * Renders a week view with mock time slots. In production this would
 * fetch from GET /api/calendar/events and GET /api/calendar/availability.
 */

import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_STATUSES,
} from "../../lib/schemas/calendar.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const MOCK_EVENTS = [
  { day: 0, hour: 9, duration: 2, title: "Personal Care — Alice", type: "booking", color: "#2563eb" },
  { day: 0, hour: 14, duration: 1, title: "Transport — Bob", type: "booking", color: "#0891b2" },
  { day: 1, hour: 10, duration: 3, title: "Available", type: "availability", color: "#16a34a" },
  { day: 2, hour: 9, duration: 4, title: "Available", type: "availability", color: "#16a34a" },
  { day: 2, hour: 14, duration: 2, title: "Therapy — Carol", type: "booking", color: "#7c3aed" },
  { day: 3, hour: 8, duration: 2, title: "Blocked", type: "block", color: "#9ca3af" },
  { day: 3, hour: 11, duration: 3, title: "Available", type: "availability", color: "#16a34a" },
  { day: 4, hour: 9, duration: 8, title: "Available", type: "availability", color: "#16a34a" },
];

export default function CalendarPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Calendar</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          Week view showing availability slots and bookings. Data from{" "}
          <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
            /api/calendar/events
          </code>
        </p>
      </header>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: "#666" }}>
        {[
          { label: "Booking", color: "#2563eb" },
          { label: "Available", color: "#16a34a" },
          { label: "Blocked", color: "#9ca3af" },
          { label: "Therapy", color: "#7c3aed" },
          { label: "Transport", color: "#0891b2" },
        ].map((l) => (
          <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "60px repeat(7, 1fr)",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 12,
      }}>
        {/* Header row */}
        <div style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", padding: 8, fontWeight: 600 }} />
        {DAYS.map((d) => (
          <div key={d} style={{
            background: "#f9fafb",
            borderBottom: "2px solid #e5e7eb",
            borderLeft: "1px solid #e5e7eb",
            padding: 8,
            fontWeight: 600,
            textAlign: "center",
          }}>
            {d}
          </div>
        ))}

        {/* Time rows */}
        {HOURS.map((h) => (
          <>
            <div
              key={`label-${h}`}
              style={{
                padding: "8px 4px",
                borderTop: "1px solid #f3f4f6",
                textAlign: "right",
                color: "#999",
                fontSize: 11,
              }}
            >
              {h}:00
            </div>
            {DAYS.map((_, dayIdx) => {
              const event = MOCK_EVENTS.find((e) => e.day === dayIdx && e.hour === h);
              return (
                <div
                  key={`cell-${h}-${dayIdx}`}
                  style={{
                    borderTop: "1px solid #f3f4f6",
                    borderLeft: "1px solid #e5e7eb",
                    padding: 2,
                    minHeight: 32,
                    position: "relative",
                  }}
                >
                  {event && (
                    <div style={{
                      background: event.color,
                      color: "white",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {event.title}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Event types and statuses reference */}
      <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
        <div style={{ flex: 1, padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#666" }}>
          <strong>Event types:</strong> {CALENDAR_EVENT_TYPES.join(", ")}
        </div>
        <div style={{ flex: 1, padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#666" }}>
          <strong>Statuses:</strong> {CALENDAR_STATUSES.join(", ")}
        </div>
      </div>

      <footer style={{ marginTop: 24, padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#666" }}>
        <strong>APIs:</strong>{" "}
        GET /api/calendar/events?from=...&amp;to=... · GET /api/calendar/availability?from=...&amp;to=... · POST /api/calendar/events
      </footer>
    </div>
  );
}
