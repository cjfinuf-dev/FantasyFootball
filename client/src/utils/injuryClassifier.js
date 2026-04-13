/**
 * Injury Classifier — Auto-parse injury type from situation notes + explicit override
 *
 * classifyPlayerInjury(player, situationChanges) → { type, severity, positionImpact } | null
 *
 * Priority:
 *   1. Explicit injuryType field on situation change entry
 *   2. Keyword matching against situation change notes
 *   3. Player status-based fallback (out/ir with no detail → 'unknown')
 *   4. Healthy → null (no active injury)
 */

import { INJURY_TYPES, POSITION_VULNERABILITY } from '../data/injurySeverity';

// ─── Keyword → injury type map ───
// Order matters: more specific patterns checked first to avoid false positives.
// Each entry: [regex, injuryType key]
const KEYWORD_MAP = [
  [/\bACL\b/i,                        'acl'],
  [/\bAchilles\b/i,                   'achilles'],
  [/\bpatellar\b/i,                   'patellar'],
  [/\bLisfranc\b/i,                   'lisfranc'],
  [/\blabrum\b/i,                     'labrum'],
  [/\bneck\b/i,                       'neck'],
  [/\bhamstring\b|\bhammy\b/i,        'hamstring'],
  [/\bhigh.?ankle\b/i,                'high_ankle'],
  [/\bmeniscus\b/i,                   'meniscus'],
  [/\bMCL\b/i,                        'mcl'],
  [/\bconcussion\b/i,                 'concussion'],
  [/\bfoot\b/i,                       'foot'],
  [/\bback\b/i,                       'back'],
  [/\bankle\b/i,                      'low_ankle'],  // generic "ankle" after high_ankle check
  [/\bcalf\b|\bsoft.?tissue\b/i,      'calf'],
  [/\bquad\b/i,                       'quad'],
  [/\bgroin\b/i,                      'groin'],
  [/\bribs?\b/i,                      'ribs'],
  [/\belbow\b/i,                      'elbow'],
  [/\bwrist\b|\bhand\b|\bfinger\b/i,  'wrist_hand'],
  [/\bbruise\b|\bcontusion\b/i,       'bruise'],
  [/\billness\b|\bflu\b|\bsick\b/i,   'illness'],
  [/\brest\b|\bDNP\b|\bvet\b/i,       'rest'],
  [/\bknee\b/i,                        'mcl'],  // conservative default for generic "knee"
];

/**
 * Classify a player's current injury from available context.
 *
 * @param {Object} player — player object from players.js (needs .id, .pos, .status)
 * @param {Array} situationChanges — combined static + dynamic situation changes
 * @returns {{ type: string, severity: number, positionImpact: number } | null}
 */
export function classifyPlayerInjury(player, situationChanges) {
  if (!player) return null;

  // Find the situation change entry for this player
  const change = situationChanges?.find(c => c.playerId === player.id);

  // 1. Explicit injuryType override on the situation change
  if (change?.injuryType) {
    const info = INJURY_TYPES[change.injuryType];
    if (info) {
      return buildResult(change.injuryType, info, player.pos);
    }
  }

  // 2. Keyword match against situation change notes
  if (change?.note) {
    const parsed = parseNote(change.note);
    if (parsed) {
      const info = INJURY_TYPES[parsed];
      if (info) {
        return buildResult(parsed, info, player.pos);
      }
    }
  }

  // 3. Player is out/ir but no injury detail → unknown with moderate severity
  if (player.status === 'out' || player.status === 'ir') {
    const info = INJURY_TYPES.unknown;
    return buildResult('unknown', info, player.pos);
  }

  // 4. Healthy or questionable without specific injury note → no active injury
  return null;
}

/**
 * Parse a note string for injury keywords.
 * @returns {string|null} injury type key or null
 */
function parseNote(note) {
  for (const [regex, type] of KEYWORD_MAP) {
    if (regex.test(note)) return type;
  }
  return null;
}

/**
 * Build a classification result with position-adjusted impact.
 */
function buildResult(type, info, pos) {
  const vuln = POSITION_VULNERABILITY[pos];
  const positionImpact = vuln
    ? (vuln[type] ?? vuln._default ?? 1.0)
    : 1.0;

  return {
    type,
    severity: info.severity,
    positionImpact,
  };
}
