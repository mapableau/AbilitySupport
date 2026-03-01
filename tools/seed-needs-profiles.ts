/**
 * tools/seed-needs-profiles.ts — CLI seed script for needs profiles.
 *
 * Inserts example needs profile snapshots showing how a participant's
 * needs evolve over a week. Run with:
 *
 *   npx ts-node tools/seed-needs-profiles.ts
 *
 * Output: JSON array of the seeded records (printed to stdout).
 * Does NOT require a live database — prints what would be inserted.
 */

import { createNeedsProfileSchema, type CreateNeedsProfileInput } from "../lib/schemas/needs-profile.js";

const PARTICIPANT_ID = "550e8400-e29b-41d4-a716-446655440000";
const COORDINATOR_ID = "660e8400-e29b-41d4-a716-446655440001";

const seedData: CreateNeedsProfileInput[] = [
  {
    participantId: PARTICIPANT_ID,
    recordedBy: COORDINATOR_ID,
    functionalNeeds: ["wheelchair", "personal_care"],
    emotionalState: "calm",
    urgencyLevel: "routine",
    activityGoal: "care",
    contextTags: ["weather:sunny", "time:morning", "location:home"],
    notes: "Regular Monday morning care session. Participant in good spirits.",
  },
  {
    participantId: PARTICIPANT_ID,
    recordedBy: COORDINATOR_ID,
    functionalNeeds: ["wheelchair", "wheelchair_transfer", "personal_care"],
    emotionalState: "anxious",
    urgencyLevel: "soon",
    activityGoal: "medical",
    contextTags: ["weather:rain", "time:afternoon", "location:clinic", "transit:delays"],
    notes: "Medical appointment at 2pm. Participant anxious about transport in rain. Need WAV with transfer assist.",
  },
  {
    participantId: PARTICIPANT_ID,
    functionalNeeds: ["wheelchair", "aac", "sensory_support"],
    emotionalState: "positive",
    urgencyLevel: "routine",
    activityGoal: "community_access",
    contextTags: ["weather:sunny", "time:morning", "location:park"],
    notes: "Weekly community access outing. Uses AAC device for communication. Enjoys outdoor activities.",
  },
  {
    participantId: PARTICIPANT_ID,
    recordedBy: COORDINATOR_ID,
    functionalNeeds: ["wheelchair", "personal_care", "medication_admin"],
    emotionalState: "stressed",
    urgencyLevel: "urgent",
    activityGoal: "care",
    contextTags: ["weather:hot", "time:evening", "location:home"],
    notes: "Medication schedule changed. Participant stressed about new routine. Urgent care visit needed.",
  },
  {
    participantId: PARTICIPANT_ID,
    functionalNeeds: ["wheelchair", "mobility_assistance"],
    emotionalState: "calm",
    urgencyLevel: "routine",
    activityGoal: "social",
    contextTags: ["weather:mild", "time:afternoon", "location:community_centre"],
    notes: "Social group meetup. Needs mobility assistance getting in/out of venue.",
  },
  {
    participantId: PARTICIPANT_ID,
    recordedBy: COORDINATOR_ID,
    functionalNeeds: ["wheelchair", "wheelchair_transfer", "manual_handling"],
    emotionalState: "distressed",
    urgencyLevel: "urgent",
    activityGoal: "medical",
    contextTags: ["weather:storm", "time:morning", "transit:cancelled", "location:hospital"],
    notes: "Emergency hospital visit. Public transport cancelled due to storm. Distressed. Need immediate WAV with manual handling.",
  },
  {
    participantId: PARTICIPANT_ID,
    functionalNeeds: ["wheelchair", "personal_care", "cognitive_support"],
    emotionalState: "withdrawn",
    urgencyLevel: "soon",
    activityGoal: "therapy",
    contextTags: ["weather:cloudy", "time:morning", "location:home"],
    notes: "Therapy session rescheduled. Participant withdrawn today — coordinator flagged for check-in.",
  },
  {
    participantId: PARTICIPANT_ID,
    functionalNeeds: ["wheelchair"],
    emotionalState: "positive",
    urgencyLevel: "routine",
    activityGoal: "errands",
    contextTags: ["weather:sunny", "time:afternoon", "transit:normal", "location:shops"],
    notes: "Weekly shopping trip. Independent apart from wheelchair transport. Good mood.",
  },
];

function run() {
  const validated: Array<CreateNeedsProfileInput & { _valid: true }> = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < seedData.length; i++) {
    const result = createNeedsProfileSchema.safeParse(seedData[i]);
    if (result.success) {
      validated.push({ ...result.data, _valid: true });
    } else {
      errors.push({
        index: i,
        error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      });
    }
  }

  if (errors.length > 0) {
    console.error("Validation errors:");
    for (const err of errors) {
      console.error(`  [${err.index}] ${err.error}`);
    }
    process.exit(1);
  }

  console.log(JSON.stringify(validated, null, 2));
  console.error(`\n✅ ${validated.length} needs profile snapshots validated.`);
  console.error("To insert into DB, pipe to psql or use the API:");
  console.error("  POST /api/needs-profiles (when implemented)");
}

run();
