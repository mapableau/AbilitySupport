import {
  detectContextChange,
  mapUrgency,
  mapEmotional,
  mapGoal,
  buildDynamicContextPrompt,
} from "./context";
import { processChatTurn } from "./turn";
import type { DynamicContext, ChatTurnInput } from "./types";

const CALM_FLEXIBLE: DynamicContext = {
  urgency: "flexible",
  emotionalState: "calm",
  goalSpecificity: "unspecified",
};

// ── mapUrgency ─────────────────────────────────────────────────────────────

describe("mapUrgency", () => {
  it("maps 'soon' to urgent match + soon needs", () => {
    const r = mapUrgency("soon");
    expect(r.match).toBe("urgent");
    expect(r.needs).toBe("soon");
  });

  it("maps 'today' to standard match + soon needs", () => {
    const r = mapUrgency("today");
    expect(r.match).toBe("standard");
    expect(r.needs).toBe("soon");
  });

  it("maps 'flexible' to low match + routine needs", () => {
    const r = mapUrgency("flexible");
    expect(r.match).toBe("low");
    expect(r.needs).toBe("routine");
  });
});

// ── mapEmotional ───────────────────────────────────────────────────────────

describe("mapEmotional", () => {
  it("maps calm → calm", () => expect(mapEmotional("calm")).toBe("calm"));
  it("maps tired → withdrawn", () => expect(mapEmotional("tired")).toBe("withdrawn"));
  it("maps anxious → anxious", () => expect(mapEmotional("anxious")).toBe("anxious"));
  it("maps overwhelmed → distressed", () => expect(mapEmotional("overwhelmed")).toBe("distressed"));
});

// ── mapGoal ────────────────────────────────────────────────────────────────

describe("mapGoal", () => {
  it("maps appointment → medical", () => expect(mapGoal("appointment")).toBe("medical"));
  it("maps social → social", () => expect(mapGoal("social")).toBe("social"));
  it("maps errand → errands", () => expect(mapGoal("errand")).toBe("errands"));
  it("maps unspecified → care", () => expect(mapGoal("unspecified")).toBe("care"));
});

// ── detectContextChange ────────────────────────────────────────────────────

describe("detectContextChange", () => {
  it("returns no change when previous is undefined", () => {
    const r = detectContextChange(undefined, CALM_FLEXIBLE);
    expect(r.changed).toBe(false);
    expect(r.severity).toBe("none");
  });

  it("returns no change when contexts are identical", () => {
    const r = detectContextChange(CALM_FLEXIBLE, CALM_FLEXIBLE);
    expect(r.changed).toBe(false);
  });

  it("detects emotional escalation calm → anxious as significant", () => {
    const r = detectContextChange(CALM_FLEXIBLE, { ...CALM_FLEXIBLE, emotionalState: "anxious" });
    expect(r.changed).toBe(true);
    expect(r.severity).toBe("significant");
    expect(r.flags).toEqual(expect.arrayContaining([expect.stringContaining("escalated")]));
  });

  it("detects emotional escalation calm → overwhelmed as significant", () => {
    const r = detectContextChange(CALM_FLEXIBLE, { ...CALM_FLEXIBLE, emotionalState: "overwhelmed" });
    expect(r.changed).toBe(true);
    expect(r.severity).toBe("significant");
  });

  it("detects emotional change tired → calm as minor", () => {
    const prev = { ...CALM_FLEXIBLE, emotionalState: "tired" as const };
    const r = detectContextChange(prev, CALM_FLEXIBLE);
    expect(r.changed).toBe(true);
    expect(r.severity).toBe("minor");
  });

  it("detects urgency escalation flexible → soon as significant", () => {
    const r = detectContextChange(CALM_FLEXIBLE, { ...CALM_FLEXIBLE, urgency: "soon" });
    expect(r.changed).toBe(true);
    expect(r.severity).toBe("significant");
    expect(r.flags).toEqual(expect.arrayContaining([expect.stringContaining("Urgency escalated")]));
  });

  it("detects urgency change today → flexible as minor", () => {
    const prev = { ...CALM_FLEXIBLE, urgency: "today" as const };
    const r = detectContextChange(prev, CALM_FLEXIBLE);
    expect(r.changed).toBe(true);
    expect(r.severity).toBe("minor");
  });

  it("detects goal change as minor", () => {
    const r = detectContextChange(CALM_FLEXIBLE, { ...CALM_FLEXIBLE, goalSpecificity: "appointment" });
    expect(r.changed).toBe(true);
    expect(r.severity).toBe("minor");
    expect(r.flags).toEqual(expect.arrayContaining([expect.stringContaining("Goal changed")]));
  });

  it("collects multiple flags", () => {
    const r = detectContextChange(CALM_FLEXIBLE, {
      urgency: "soon",
      emotionalState: "overwhelmed",
      goalSpecificity: "appointment",
    });
    expect(r.changed).toBe(true);
    expect(r.flags.length).toBe(3);
    expect(r.severity).toBe("significant");
  });
});

// ── buildDynamicContextPrompt ──────────────────────────────────────────────

describe("buildDynamicContextPrompt", () => {
  it("includes urgency, emotional state, and goal", () => {
    const prompt = buildDynamicContextPrompt(CALM_FLEXIBLE, { changed: false, flags: [], severity: "none" });
    expect(prompt).toContain("Urgency: flexible");
    expect(prompt).toContain("Emotional: calm");
    expect(prompt).toContain("Goal: unspecified");
  });

  it("includes context change warning when significant", () => {
    const change = {
      changed: true,
      flags: ["Emotional state escalated: calm → anxious"],
      severity: "significant" as const,
    };
    const prompt = buildDynamicContextPrompt({ ...CALM_FLEXIBLE, emotionalState: "anxious" }, change);
    expect(prompt).toContain("Context change detected (significant)");
    expect(prompt).toContain("Acknowledge the change empathetically");
  });

  it("includes functional needs when provided", () => {
    const ctx = { ...CALM_FLEXIBLE, functionalNeeds: ["wheelchair", "aac"] };
    const prompt = buildDynamicContextPrompt(ctx, { changed: false, flags: [], severity: "none" });
    expect(prompt).toContain("wheelchair, aac");
  });
});

// ── processChatTurn (integration) ──────────────────────────────────────────

describe("processChatTurn", () => {
  const BASE_INPUT: ChatTurnInput = {
    participantProfileId: "550e8400-e29b-41d4-a716-446655440000",
    messages: [{ role: "user", content: "I need transport to my physio" }],
    dynamicContext: {
      urgency: "today",
      emotionalState: "calm",
      goalSpecificity: "appointment",
    },
  };

  it("returns a reply, match spec, and needs profile ID", async () => {
    const result = await processChatTurn(BASE_INPUT);
    expect(result.reply).toBeTruthy();
    expect(result.matchSpec).toBeTruthy();
    expect(result.needsProfileId).toBeTruthy();
    expect(result.contextChange.changed).toBe(false);
  });

  it("enriches match spec from dynamic context", async () => {
    const result = await processChatTurn(BASE_INPUT);
    expect(result.matchSpec?.requestType).toBe("transport");
    expect(result.matchSpec?.urgency).toBe("standard");
  });

  it("detects significant context change when previous is provided", async () => {
    const input = {
      ...BASE_INPUT,
      dynamicContext: { urgency: "soon" as const, emotionalState: "overwhelmed" as const, goalSpecificity: "appointment" as const },
      previousContext: { urgency: "flexible" as const, emotionalState: "calm" as const, goalSpecificity: "unspecified" as const },
    };
    const result = await processChatTurn(input);
    expect(result.contextChange.changed).toBe(true);
    expect(result.contextChange.severity).toBe("significant");
    expect(result.reply).toContain("changed");
  });

  it("generates urgent match spec when urgency is 'soon'", async () => {
    const input = {
      ...BASE_INPUT,
      dynamicContext: { urgency: "soon" as const, emotionalState: "calm" as const, goalSpecificity: "errand" as const },
    };
    const result = await processChatTurn(input);
    expect(result.matchSpec?.urgency).toBe("urgent");
    expect(result.reply).toContain("soon");
  });
});
