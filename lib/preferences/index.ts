/**
 * lib/preferences — Participant preference weight management.
 *
 * Learns from service outcomes to adjust matching weights over time.
 */

export {
  computeWeightAdjustments,
  applyWeightAdjustments,
  parseWeights,
  DEFAULT_WEIGHTS,
  PREFERENCE_WEIGHT_KEYS,
  type PreferenceWeights,
  type PreferenceWeightKey,
  type WeightAdjustment,
} from "./weights.js";
export {
  loadPreferenceWeights,
  savePreferenceWeights,
} from "./data.js";
