/**
 * lib/preferences/data.ts — Persistence for preference weights.
 *
 * Reads/writes the weights sub-object inside
 * participant_preferences.service_preferences JSONB.
 */

import type { PreferenceWeights } from "./weights.js";

/**
 * Load current preference weights for a participant.
 * Falls back to DEFAULT_WEIGHTS for any missing keys.
 *
 * TODO: SELECT service_preferences FROM participant_preferences
 *   WHERE participant_profile_id = $1
 */
export async function loadPreferenceWeights(
  participantProfileId: string,
): Promise<PreferenceWeights | null> {
  console.log(`[preferences] loadPreferenceWeights(${participantProfileId}) — stub`);
  return null;
}

/**
 * Save updated preference weights.
 *
 * TODO: UPDATE participant_preferences
 *   SET service_preferences = jsonb_set(service_preferences, '{weights}', $2::jsonb),
 *       updated_at = now()
 *   WHERE participant_profile_id = $1
 */
export async function savePreferenceWeights(
  participantProfileId: string,
  weights: PreferenceWeights,
): Promise<void> {
  console.log(`[preferences] savePreferenceWeights(${participantProfileId}) — stub`);
  void weights;
}
