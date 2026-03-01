/**
 * /chat — Chat UI with dynamic context chips.
 *
 * Shows a conversation view with selectable context chips for:
 *   - Urgency: Soon / Today / Flexible
 *   - Emotional context: Calm / Tired / Anxious / Overwhelmed
 *   - Goal specificity: Appointment / Social / Errand / Unspecified
 *
 * Selected chips are sent with each chat turn to POST /api/chat/turn.
 * Context changes between turns are detected and flagged.
 */

const CHIP_GROUPS = [
  {
    label: "Urgency",
    key: "urgency",
    options: [
      { value: "soon", label: "Soon", color: "#dc2626" },
      { value: "today", label: "Today", color: "#ea580c" },
      { value: "flexible", label: "Flexible", color: "#16a34a" },
    ],
    default: "flexible",
  },
  {
    label: "How are you feeling?",
    key: "emotionalState",
    options: [
      { value: "calm", label: "Calm", color: "#16a34a" },
      { value: "tired", label: "Tired", color: "#ca8a04" },
      { value: "anxious", label: "Anxious", color: "#ea580c" },
      { value: "overwhelmed", label: "Overwhelmed", color: "#dc2626" },
    ],
    default: "calm",
  },
  {
    label: "What do you need?",
    key: "goalSpecificity",
    options: [
      { value: "appointment", label: "Appointment", color: "#7c3aed" },
      { value: "social", label: "Social", color: "#2563eb" },
      { value: "errand", label: "Errand", color: "#0891b2" },
      { value: "unspecified", label: "Not sure yet", color: "#6b7280" },
    ],
    default: "unspecified",
  },
];

export default function ChatPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Chat with MapAble</h1>
        <p style={{ color: "#666", fontSize: 14 }}>
          Tell us what you need. Select the chips below to help us understand your situation,
          then type your message.
        </p>
      </header>

      {/* ── Context Chips ──────────────────────────────────────────────── */}
      <section style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
      }}>
        {CHIP_GROUPS.map((group) => (
          <div key={group.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
              {group.label}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {group.options.map((opt) => {
                const isDefault = opt.value === group.default;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    style={{
                      padding: "6px 16px",
                      borderRadius: 99,
                      border: isDefault ? `2px solid ${opt.color}` : "1px solid #d1d5db",
                      background: isDefault ? opt.color : "white",
                      color: isDefault ? "white" : "#374151",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ── Chat Messages ──────────────────────────────────────────────── */}
      <section style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        marginBottom: 24,
        minHeight: 300,
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ flex: 1, padding: 20 }}>
          {/* System message */}
          <div style={{
            background: "#eff6ff",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            color: "#1e40af",
          }}>
            Hi! I&apos;m MapAble. Select your urgency, how you&apos;re feeling, and what you need using the chips above, then tell me more about what you&apos;re looking for.
          </div>

          {/* Example user message */}
          <div style={{
            background: "#f3f4f6",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            marginLeft: 40,
            textAlign: "right",
          }}>
            I need someone to take me to my physio appointment tomorrow morning. I use a wheelchair.
          </div>

          {/* Example assistant reply */}
          <div style={{
            background: "#f0fdf4",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            borderLeft: "3px solid #16a34a",
          }}>
            I understand — you need transport to a physio appointment tomorrow morning with wheelchair access. Let me find providers with WAV vehicles near you who are available in the morning.
            <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>
              Context: urgency=today · emotional=calm · goal=appointment · needs=wheelchair
            </div>
          </div>

          {/* Context change example */}
          <div style={{
            background: "#fef2f2",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            borderLeft: "3px solid #dc2626",
          }}>
            ⚠ <strong>Context change detected:</strong> Emotional state escalated: calm → anxious. Urgency changed: today → soon.
            <br />
            I notice things have changed — let me adjust my recommendations to match how you&apos;re feeling right now.
          </div>
        </div>

        {/* Input area */}
        <div style={{
          borderTop: "1px solid #e5e7eb",
          padding: 12,
          display: "flex",
          gap: 8,
        }}>
          <input
            type="text"
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
          />
          <button
            type="button"
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </section>

      {/* ── API Reference ──────────────────────────────────────────────── */}
      <footer style={{
        padding: 16,
        background: "#f9fafb",
        borderRadius: 8,
        fontSize: 13,
        color: "#666",
      }}>
        <strong>API:</strong> POST /api/chat/turn
        <br />
        <strong>Body:</strong>{" "}
        <code>{`{ participantProfileId, messages, dynamicContext: { urgency, emotionalState, goalSpecificity }, previousContext? }`}</code>
        <br /><br />
        <strong>Flow:</strong> chips selected → message sent → context change detected → needs profile snapshot persisted → match spec enriched → reply generated
        <br /><br />
        <strong>Context change flags:</strong> emotional escalation (calm→anxious), urgency jump (flexible→soon), goal change. Significant changes trigger empathetic acknowledgement in the reply.
      </footer>
    </div>
  );
}
