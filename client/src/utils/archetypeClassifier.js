/**
 * archetypeClassifier.js — Stat-driven player archetype classification
 *
 * Replaces the manual PLAYER_ARCHETYPES mapping with threshold-based
 * classification derived from real inline stats on player objects.
 *
 * The ARCHETYPES dictionary (fantasyPremium, floorBoost, pprAdjust values)
 * is imported from playerArchetypes.js — only the assignment logic changes.
 *
 * Stats used per position:
 *   QB:  rushYds, carries, rushTd, passEpa, passTd, gp
 *   RB:  carries, tgtShare, rec, rushYds
 *   WR:  tgtShare, recYds, tgt, airShare, rec, racr, yac
 *   TE:  tgtShare, rec
 */

import { ARCHETYPES } from '../data/playerArchetypes';

/**
 * Classify a player's archetype from their current-season stats.
 *
 * @param {Object} player — Player object with inline stats from players.js
 * @param {string} pos — Position (QB, RB, WR, TE, K, DEF)
 * @returns {Object} Archetype object from ARCHETYPES dict (with .key added)
 */
export function classifyArchetype(player, pos) {
  const key = classifyKey(player, pos);
  const archetype = ARCHETYPES[key] || ARCHETYPES['default'];
  return { ...archetype, key };
}

function classifyKey(p, pos) {
  if (!p.gp || p.gp < 4) return 'sample-too-small';
  switch (pos) {
    case 'QB': return classifyQB(p);
    case 'RB': return classifyRB(p);
    case 'WR': return classifyWR(p);
    case 'TE': return classifyTE(p);
    default:   return 'default';
  }
}

function classifyQB(p) {
  if (!p.gp || p.gp <= 0) return 'game-manager';

  const gp = p.gp;
  // Normalize volume stats to a 17-game pace so partial-season players
  // are classified on rate, not raw totals. Floor at 8 to avoid amplifying
  // tiny samples.
  // Cap at 1.0 so partial-season rates aren't projected past full-season totals,
  // which would misclassify flukes as elite workloads.
  const gpScale = Math.min(1.0, 17 / Math.max(gp, 8));

  const rushYds = p.rushYds || 0;
  const carries = p.carries || 0;
  const rushTd = p.rushTd || 0;
  const passEpaPerGm = (p.passEpa || 0) / gp;
  const passTd = p.passTd || 0;

  // Dual-threat elite: elite rushing production
  if (rushYds * gpScale >= 400 && carries * gpScale >= 80 && rushTd * gpScale >= 5) return 'dual-threat-elite';

  // Dual-threat: meaningful rushing involvement
  if (rushYds * gpScale >= 250 && carries * gpScale >= 50) return 'dual-threat';

  // Pocket elite: high efficiency passer (passEpaPerGm already per-game)
  if (passEpaPerGm >= 5 && passTd * gpScale >= 25) return 'pocket-elite';

  // Pocket passer: positive EPA, regular starter
  if (passEpaPerGm >= 0 && gp >= 10) return 'pocket-passer';

  // Game manager: everything else
  return 'game-manager';
}

function classifyRB(p) {
  if (!p.gp || p.gp <= 0) return 'backup';
  const gp = p.gp || 0;
  // Cap at 1.0 so partial-season rates aren't projected past full-season totals,
  // which would misclassify flukes as elite workloads.
  const gpScale = Math.min(1.0, 17 / Math.max(gp, 8));

  const carries = p.carries || 0;
  const tgtShare = p.tgtShare || 0; // already a rate — no scaling
  const rec = p.rec || 0;

  // Bell-cow: high volume in both phases
  if (carries * gpScale >= 200 && tgtShare >= 0.15 && rec * gpScale >= 50) return 'bell-cow';

  // Elite pass-catcher: receiving-oriented back
  if (rec * gpScale >= 40 && tgtShare >= 0.12) return 'elite-pass-catch';

  // Power back: ground-and-pound, limited receiving
  if (carries * gpScale >= 180 && tgtShare < 0.10) return 'power-back';

  // Committee: moderate workload
  if (carries * gpScale >= 75) return 'committee';

  // Backup
  return 'backup';
}

function classifyWR(p) {
  if (!p.gp || p.gp <= 0) return 'wr2-wr3';
  const gp = p.gp || 0;
  // Cap at 1.0 so partial-season rates aren't projected past full-season totals,
  // which would misclassify flukes as elite workloads.
  const gpScale = Math.min(1.0, 17 / Math.max(gp, 8));

  const tgtShare = p.tgtShare || 0; // rate — no scaling
  const recYds = p.recYds || 0;
  const tgt = p.tgt || 0;
  const airShare = p.airShare || 0; // rate — no scaling
  const rec = p.rec || 0;
  const racr = p.racr || 0;         // rate — no scaling
  const yac = p.yac || 0;

  // Alpha WR: dominant target share + high yardage
  if (tgtShare >= 0.25 && recYds * gpScale >= 1000) return 'alpha-wr';

  // Target hog: high volume receiver
  if (tgt * gpScale >= 120 && tgtShare >= 0.20) return 'target-hog';

  // Deep threat: high air yards share, big plays (yds/rec is per-game — no scaling)
  if (airShare >= 0.30 && rec > 0 && recYds / rec >= 15) return 'deep-threat';

  // Slot WR: efficient underneath receiver
  if (rec * gpScale >= 70 && racr >= 0.95 && rec > 0 && yac / rec >= 5) return 'slot-wr';

  // WR2/WR3
  return 'wr2-wr3';
}

function classifyTE(p) {
  if (!p.gp || p.gp <= 0) return 'blocking-te';
  const gp = p.gp || 0;
  // Cap at 1.0 so partial-season rates aren't projected past full-season totals,
  // which would misclassify flukes as elite workloads.
  const gpScale = Math.min(1.0, 17 / Math.max(gp, 8));

  const tgtShare = p.tgtShare || 0; // rate — no scaling
  const rec = p.rec || 0;

  // Elite TE: dominant target share and volume
  if (tgtShare >= 0.20 && rec * gpScale >= 80) return 'elite-te';

  // Receiving TE: meaningful pass-catching role
  if (rec * gpScale >= 40 && tgtShare >= 0.10) return 'receiving-te';

  // Blocking TE
  return 'blocking-te';
}
