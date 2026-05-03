/**
 * Tiny intent parser for voice quick-log. Recognises phrases like:
 *   "log avocado"
 *   "log 2 cubes of pea puree"
 *   "feeding sweet potato"
 * Returns null if nothing matches.
 */

export interface VoiceIntent {
  food: string;
  quantity?: number;
  unit?: string;
}

const VERBS = ["log", "feed", "feeding", "fed", "give", "gave", "ate", "eat", "had"];

export function parseVoiceIntent(rawTranscript: string): VoiceIntent | null {
  const t = rawTranscript.trim().toLowerCase();
  if (!t) return null;

  // Strip a leading verb if present.
  let body = t;
  for (const v of VERBS) {
    if (body.startsWith(v + " ")) {
      body = body.slice(v.length + 1).trim();
      break;
    }
  }

  // Optional quantity + unit prefix.
  let quantity: number | undefined;
  let unit: string | undefined;
  const m = body.match(/^(\d+(?:\.\d+)?)\s+(cubes?|jars?|pouches?|servings?|grams?|g|ml|tbsp|tsp|cups?|oz)\s+(?:of\s+)?(.+)$/);
  if (m) {
    quantity = Number(m[1]);
    unit = m[2];
    body = m[3].trim();
  } else {
    const justNumber = body.match(/^(\d+(?:\.\d+)?)\s+(?:of\s+)?(.+)$/);
    if (justNumber) {
      quantity = Number(justNumber[1]);
      body = justNumber[2].trim();
    }
  }

  body = body.replace(/^(some|a|an|the)\s+/, "").trim();
  if (!body) return null;
  return { food: body, quantity, unit };
}
