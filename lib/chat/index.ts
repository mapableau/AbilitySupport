/**
 * lib/chat — Chat turn processing with dynamic context.
 */

export * from "./types.js";
export { processChatTurn } from "./turn.js";
export {
  detectContextChange,
  mapUrgency,
  mapEmotional,
  mapGoal,
  buildDynamicContextPrompt,
} from "./context.js";
