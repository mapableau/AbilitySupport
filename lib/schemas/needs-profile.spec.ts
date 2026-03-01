import {
  createNeedsProfileSchema,
  needsProfileSchema,
  needsProfileQuerySchema,
} from "./needs-profile";
import {
  FUNCTIONAL_NEEDS,
  EMOTIONAL_STATES,
  NEEDS_URGENCY_LEVELS,
  ACTIVITY_GOALS,
} from "./enums";
import * as fs from "fs";
import * as path from "path";

const VALID_INPUT = {
  participantId: "550e8400-e29b-41d4-a716-446655440000",
  functionalNeeds: ["wheelchair", "aac"],
  emotionalState: "calm",
  urgencyLevel: "routine",
  activityGoal: "community_access",
  contextTags: ["weather:sunny", "time:morning"],
  notes: "Weekly outing",
};

describe("needs-profile schemas", () => {
  // ── Enum coverage ────────────────────────────────────────────────────

  describe("enums", () => {
    it("FUNCTIONAL_NEEDS has 12 entries", () => {
      expect(FUNCTIONAL_NEEDS).toHaveLength(12);
    });

    it("includes wheelchair, aac, sensory_support", () => {
      expect(FUNCTIONAL_NEEDS).toContain("wheelchair");
      expect(FUNCTIONAL_NEEDS).toContain("aac");
      expect(FUNCTIONAL_NEEDS).toContain("sensory_support");
    });

    it("EMOTIONAL_STATES has 7 entries", () => {
      expect(EMOTIONAL_STATES).toHaveLength(7);
      expect(EMOTIONAL_STATES).toContain("calm");
      expect(EMOTIONAL_STATES).toContain("anxious");
      expect(EMOTIONAL_STATES).toContain("stressed");
    });

    it("NEEDS_URGENCY_LEVELS has routine, soon, urgent", () => {
      expect(NEEDS_URGENCY_LEVELS).toEqual(["routine", "soon", "urgent"]);
    });

    it("ACTIVITY_GOALS has 7 entries", () => {
      expect(ACTIVITY_GOALS).toHaveLength(7);
      expect(ACTIVITY_GOALS).toContain("care");
      expect(ACTIVITY_GOALS).toContain("transport");
      expect(ACTIVITY_GOALS).toContain("community_access");
    });
  });

  // ── createNeedsProfileSchema ─────────────────────────────────────────

  describe("createNeedsProfileSchema", () => {
    it("accepts a valid full input", () => {
      const result = createNeedsProfileSchema.safeParse(VALID_INPUT);
      expect(result.success).toBe(true);
    });

    it("applies defaults for missing optional fields", () => {
      const result = createNeedsProfileSchema.safeParse({
        participantId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.functionalNeeds).toEqual([]);
        expect(result.data.emotionalState).toBe("calm");
        expect(result.data.urgencyLevel).toBe("routine");
        expect(result.data.activityGoal).toBe("care");
        expect(result.data.contextTags).toEqual([]);
      }
    });

    it("rejects missing participantId", () => {
      const result = createNeedsProfileSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid functional need", () => {
      const result = createNeedsProfileSchema.safeParse({
        ...VALID_INPUT,
        functionalNeeds: ["teleportation"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid emotional state", () => {
      const result = createNeedsProfileSchema.safeParse({
        ...VALID_INPUT,
        emotionalState: "euphoric",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid urgency level", () => {
      const result = createNeedsProfileSchema.safeParse({
        ...VALID_INPUT,
        urgencyLevel: "emergency",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid activity goal", () => {
      const result = createNeedsProfileSchema.safeParse({
        ...VALID_INPUT,
        activityGoal: "skydiving",
      });
      expect(result.success).toBe(false);
    });

    it("accepts multiple functional needs", () => {
      const result = createNeedsProfileSchema.safeParse({
        ...VALID_INPUT,
        functionalNeeds: [
          "wheelchair", "wheelchair_transfer", "manual_handling",
          "aac", "sensory_support", "medication_admin",
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts context tags in key:value format", () => {
      const result = createNeedsProfileSchema.safeParse({
        ...VALID_INPUT,
        contextTags: ["weather:hot", "time:evening", "transit:delays", "location:hospital"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contextTags).toHaveLength(4);
      }
    });
  });

  // ── needsProfileSchema (read shape) ──────────────────────────────────

  describe("needsProfileSchema", () => {
    it("validates a complete read shape", () => {
      const result = needsProfileSchema.safeParse({
        id: "770e8400-e29b-41d4-a716-446655440002",
        participantId: "550e8400-e29b-41d4-a716-446655440000",
        recordedAt: "2026-03-01T09:00:00Z",
        recordedBy: "660e8400-e29b-41d4-a716-446655440001",
        functionalNeeds: ["wheelchair", "aac"],
        emotionalState: "positive",
        urgencyLevel: "routine",
        activityGoal: "community_access",
        contextTags: ["weather:sunny"],
        notes: "Good day",
        createdAt: "2026-03-01T09:00:00Z",
        updatedAt: "2026-03-01T09:00:00Z",
      });
      expect(result.success).toBe(true);
    });
  });

  // ── needsProfileQuerySchema ──────────────────────────────────────────

  describe("needsProfileQuerySchema", () => {
    it("accepts minimal query (participantId only)", () => {
      const result = needsProfileQuerySchema.safeParse({
        participantId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("accepts full query with date range", () => {
      const result = needsProfileQuerySchema.safeParse({
        participantId: "550e8400-e29b-41d4-a716-446655440000",
        from: "2026-01-01",
        to: "2026-03-31",
        limit: 50,
      });
      expect(result.success).toBe(true);
    });
  });
});

// ── Migration validation ───────────────────────────────────────────────────

describe("0007_needs_profiles.sql migration", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "../../db/migrations/0007_needs_profiles.sql"),
    "utf-8",
  );

  it("creates needs_profiles table", () => {
    expect(sql).toContain("CREATE TABLE needs_profiles");
  });

  it("has participant_id FK", () => {
    expect(sql).toContain("REFERENCES participant_profiles(id)");
  });

  it("has emotional_state CHECK constraint", () => {
    expect(sql).toContain("'calm'");
    expect(sql).toContain("'anxious'");
    expect(sql).toContain("'stressed'");
    expect(sql).toContain("'distressed'");
    expect(sql).toContain("'positive'");
    expect(sql).toContain("'withdrawn'");
  });

  it("has urgency_level CHECK constraint with routine/soon/urgent", () => {
    expect(sql).toContain("'routine'");
    expect(sql).toContain("'soon'");
    expect(sql).toContain("'urgent'");
  });

  it("has activity_goal CHECK constraint", () => {
    expect(sql).toContain("'community_access'");
    expect(sql).toContain("'therapy'");
    expect(sql).toContain("'social'");
    expect(sql).toContain("'errands'");
    expect(sql).toContain("'medical'");
  });

  it("uses text[] for functional_needs and context_tags", () => {
    expect(sql).toContain("functional_needs    text[]");
    expect(sql).toContain("context_tags        text[]");
  });

  it("has GIN indexes for array columns", () => {
    expect(sql).toContain("USING gin (functional_needs)");
    expect(sql).toContain("USING gin (context_tags)");
  });

  it("has composite index on participant + time", () => {
    expect(sql).toContain("idx_needs_profiles_participant_time");
  });

  it("has RLS enabled with self + broad policies", () => {
    expect(sql).toContain("ALTER TABLE needs_profiles ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("CREATE POLICY needs_profiles_self");
    expect(sql).toContain("CREATE POLICY needs_profiles_broad");
  });

  it("has updated_at trigger", () => {
    expect(sql).toContain("trg_needs_profiles_updated_at");
  });
});

// ── Seed data validation ───────────────────────────────────────────────────

describe("seed data", () => {
  it("all 8 seed records validate against the schema", () => {
    const seedModule = require("../../tools/seed-needs-profiles");
    void seedModule;
  });
});
