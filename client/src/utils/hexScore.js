/**
 * HexScore — Proprietary Player Valuation Engine
 *
 * An eight-dimensional composite score (0-100) combining:
 *   1. Production (0.25) — 3-year weighted historical production, scoring-format adjusted
 *   2. Positional Scarcity (0.15) — exponential decay with position-specific curves
 *   3. Consistency (0.09) — inverse coefficient of variation
 *   4. Situation (0.17) — team scheme, QB quality, offensive context, situation changes
 *   5. Health (0.08) — current status-based discount
 *   6. Durability (0.11) — 3-year injury history: availability, frequency, severity
 *   7. Roster Context (0.07) — team need multiplier (optional)
 *   8. Age Factor (0.08) — position-specific career arc depreciation
 *
 * Age curves model statistical NFL prime windows per position:
 *   QB 26-34, RB 22-27, WR 24-30, TE 25-31, K 25-36.
 *   Players in-prime score 1.0; pre-prime get a mild ramp; post-prime
 *   decline accelerates past a position-specific cliff age.
 *   Dynasty format doubles the age weight (0.14) to reflect career runway.
 *
 * Scoring-format-aware: each league preset (PPR, standard, 6pt pass TD, etc.)
 * adjusts position production multipliers and scarcity curves.
 */

import { PLAYERS } from '../data/players';
import { ROSTER_PRESETS } from '../data/scoring';
import { TEAM_PROFILES, SCHEME_FIT, SITUATION_CHANGES } from '../data/teamProfiles';
import { getPlayerAge } from '../data/playerAges';
import { HISTORICAL_STATS } from '../data/historicalStats';
import { calcStatProduction } from './statProduction';
import { classifyArchetype } from './archetypeClassifier';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// ─── Memoized per-preset cache ───
const _hexCache = {};

// ─── Historical stats — loaded immediately at module level so the first
// HexScore computation has full multi-year data. Server API can override later.
let _historicalData = HISTORICAL_STATS?.players ? HISTORICAL_STATS : null;

export function setHistoricalData(data) {
  _historicalData = data;
  Object.keys(_hexCache).forEach(k => delete _hexCache[k]);
  Object.keys(_slotValueCache).forEach(k => delete _slotValueCache[k]);
}

// ─── Dynamic situation events (injected from server news pipeline) ───
let _dynamicSituationChanges = [];

export function setSituationEvents(events) {
  _dynamicSituationChanges = (events || [])
    .filter(e => e.active)
    .map(e => ({
      playerId: e.player_id || null,
      team: e.team || null,
      impact: e.impact,
      note: e.description || e.event_type,
      eventType: e.event_type,
      confidence: e.confidence,
      articleId: e.source_article_id,
    }));
  Object.keys(_hexCache).forEach(k => delete _hexCache[k]);
}

export function getDynamicSituationEvents() {
  return _dynamicSituationChanges;
}

export function getHistoricalData() {
  return _historicalData;
}

/**
 * Compute weighted historical production for a player.
 * Weights: 50% most recent, 25% prior, 15% two years ago, 10% three years ago.
 * Adapts to available data (rookies get full weight on available seasons).
 */
function getWeightedProduction(playerId) {
  if (!_historicalData?.players) {
    // Fallback: use current avg from players.js if server data not yet loaded
    const p = PLAYER_MAP[playerId];
    return p ? p.avg : 0;
  }

  const history = _historicalData.players[playerId];
  if (!history) {
    const p = PLAYER_MAP[playerId];
    return p ? p.avg : 0;
  }

  // Get qualifying seasons (gp >= 8) sorted descending.
  // Injury seasons with minimal games are noise, not signal — exclude them
  // so they don't poison the weighted average with near-zero production.
  const allYears = Object.keys(history).map(Number).sort((a, b) => b - a);
  if (allYears.length === 0) return 0;

  const qualified = allYears
    .map(y => ({ year: y, avg: history[String(y)]?.avgPts || 0, gp: history[String(y)]?.gp || 0 }))
    .filter(s => s.gp >= 8);

  if (qualified.length === 0) {
    const p = PLAYER_MAP[playerId];
    return p ? p.avg : 0;
  }

  const avgs = qualified.map(s => s.avg);

  // Fluke dampener: when the most recent qualifying season is anomalously low
  // relative to an established track record, partially restore it toward the
  // historical baseline. Only fires on large drops (30%+) and skips players
  // showing a consistent downward trend — that's real regression, not a fluke.
  if (avgs.length >= 3) {
    const recent = avgs[0];
    const declining = avgs[0] < avgs[1] && avgs[1] < avgs[2];
    if (!declining) {
      const priorValid = avgs.slice(1).filter(v => v > 0);
      if (priorValid.length >= 2) {
        const sorted = [...priorValid].sort((a, b) => a - b);
        const priorMedian = sorted[Math.floor(sorted.length / 2)];
        const dropPct = priorMedian > 0 ? Math.max(0, (priorMedian - recent) / priorMedian) : 0;

        if (dropPct > 0.30) {
          const trackStrength = Math.min(1.0, priorValid.length / 4);
          const flukeConf = Math.min(1.0, dropPct / 0.50) * trackStrength;
          avgs[0] = recent + (priorMedian - recent) * flukeConf * 0.50;
        }
      }
    }
  }

  // Recent production weighted heavily, but only from qualifying seasons.
  if (avgs.length >= 4) return avgs[0] * 0.65 + avgs[1] * 0.20 + avgs[2] * 0.10 + avgs[3] * 0.05;
  if (avgs.length === 3) return avgs[0] * 0.65 + avgs[1] * 0.25 + avgs[2] * 0.10;
  if (avgs.length === 2) return avgs[0] * 0.70 + avgs[1] * 0.30;
  return avgs[0];
}

// ─── Scarcity — pure positional rank ───
// Scarcity is simply where you rank among rosterable players at your position.
// Best player = 1.0, worst = ~0. No exponential curves or arbitrary k values —
// the score IS "how many players at your position would you drop before this one."
// Startable thresholds retained only for the getScarcityCurve API (used by
// slot value and draft value calculations).
const SCARCITY_CURVES = {
  QB:  { startable: 12 },
  RB:  { startable: 24 },
  WR:  { startable: 24 },
  TE:  { startable: 12 },
  K:   { startable: 12 },
  DEF: { startable: 12 },
};

// ─── Scoring format profiles ───
// Each profile has:
//   prodMultiplier: per-position multiplier on production score
//   scarcityOverrides: per-position k-value overrides (merged with base)
const SCORING_PROFILES = {
  standard: {
    prodMultiplier: { QB: 1.0, RB: 1.15, WR: 0.95, TE: 0.90, K: 1.0, DEF: 1.0 },
    slotValueOverrides: {},
  },
  ppr: {
    prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.15, TE: 1.05, K: 1.0, DEF: 1.0 },
    slotValueOverrides: {},
  },
  halfPpr: {
    prodMultiplier: { QB: 1.0, RB: 1.05, WR: 1.08, TE: 1.05, K: 1.0, DEF: 1.0 },
    slotValueOverrides: {},
  },
  sixPtPassTd: {
    prodMultiplier: { QB: 1.25, RB: 0.95, WR: 0.95, TE: 0.95, K: 1.0, DEF: 1.0 },
    slotValueOverrides: { productionOverride: { QB: 1.10 } },
  },
  tePremium: {
    prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.10, TE: 1.20, K: 1.0, DEF: 1.0 },
    slotValueOverrides: { productionOverride: { TE: 0.60 } },
  },
  superflex: {
    prodMultiplier: { QB: 1.20, RB: 0.95, WR: 0.95, TE: 0.95, K: 1.0, DEF: 1.0 },
    slotValueOverrides: { extraFlexSlots: { QB: ['SFLEX'] } },
  },
  dynasty: {
    prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.05, TE: 1.0, K: 0.80, DEF: 0.80 },
    slotValueOverrides: {},
    ageWeightOverride: 0.14,
  },
};

const DEFAULT_PROFILE = { prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.0, TE: 1.0, K: 1.0, DEF: 1.0 } };

function getScoringProfile(preset) {
  return SCORING_PROFILES[preset] || DEFAULT_PROFILE;
}

function getScarcityCurve(pos) {
  return SCARCITY_CURVES[pos] || { startable: 12 };
}

// ─── Other constants ───

const HEALTH_MULTIPLIERS = {
  healthy: 1.0,
  questionable: 0.75,
  doubtful: 0.40,
  out: 0.10,
  ir: 0.05,
};

// ─── Slot Value sub-factors ───
// Positional value is derived from roster economics, not hardcoded ceilings.
// Four sub-factors: slot eligibility (how many roster slots can you fill?),
// demand pressure (league-wide demand vs supply), attrition (injury risk at
// the position), and production profile (raw point output characteristics).
const FLEX_SLOT_ELIGIBILITY = {
  FLEX:  ['RB', 'WR', 'TE'],
  SFLEX: ['QB', 'RB', 'WR', 'TE'],
};

// Position-level injury attrition — higher = scarcer healthy players
const POSITION_ATTRITION = {
  QB: 0.75, RB: 1.00, WR: 0.85, TE: 0.90, K: 0.50, DEF: 0.50,
};

// Raw point production characteristics — QB is highest floor/ceiling
const PRODUCTION_PROFILE = {
  QB: 1.00, RB: 0.70, WR: 0.68, TE: 0.50, K: 0.30, DEF: 0.35,
};

const SLOT_SUB_WEIGHTS = { eligibility: 0.25, demand: 0.20, attrition: 0.20, production: 0.35 };
const DEFAULT_LEAGUE_SIZE = 12;

// Position HexScore caps — applied on final score after sigmoid.
// QB capped at 85: no QB should rank in the top 20 overall (elite RBs/WRs fill those slots).
// K/DEF capped at 60: kickers and defenses are always end-of-draft value.
const POSITION_HEXSCORE_CAP = { K: 65, DEF: 60 };

// ─── Pedigree Bonus System ───
// Post-sigmoid additive bonus (0–10 pts) rewarding sustained elite performance.
// Replaces static ELITE_OVERRIDES with a dynamic, data-driven valuation.
const PEDIGREE_THRESHOLDS = {
  QB:  { strong: 20, elite: 23, dominant: 25 },
  RB:  { strong: 14, elite: 18, dominant: 22 },
  WR:  { strong: 14, elite: 17, dominant: 20 },
  TE:  { strong: 12, elite: 15, dominant: 18 },
};

const ARCHETYPE_PEDIGREE = {
  'dual-threat-elite': 1.0, 'bell-cow': 1.0, 'alpha-wr': 1.0, 'elite-te': 1.0,
  'dual-threat': 0.80,      'pocket-elite': 0.85, 'elite-pass-catch': 0.85,
  'target-hog': 0.75,       'power-back': 0.70,   'deep-threat': 0.65,
  'pocket-passer': 0.60,    'slot-wr': 0.60,      'receiving-te': 0.55,
  'committee': 0.40,        'game-manager': 0.35,  'blocking-te': 0.30,
  'wr2-wr3': 0.35,          'backup': 0.20,
};

const MAX_PEDIGREE_BONUS = 6;

// ─── Draft Value ───
// How many players at each position are worth spending a draft pick on.
// Multiplied by league size to get the draftable threshold.
// Beyond this threshold, players are considered undraftable (waiver-wire)
// and their HexScore is heavily penalized.
const DRAFTABLE_MULTIPLIER = {
  QB: 1.67, // ~20 in a 12-team league — top 20 QBs are draftable
  RB: 4,    // 3-5 per team worth drafting — leagueSize * 4
  WR: 4,    // 3-5 per team worth drafting — leagueSize * 4
  TE: 2,    // backup TEs worth grabbing — leagueSize * 2
  K: 1,     // only starters, no backup kickers
  DEF: 1,   // only starters, no backup defenses
};

function getDraftableDepth(pos, leagueSize = DEFAULT_LEAGUE_SIZE) {
  return Math.round(leagueSize * (DRAFTABLE_MULTIPLIER[pos] || 1));
}

const IDEAL_ROSTER = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DEF: 1 };

const WEIGHTS = {
  production: 0.25,
  scarcity: 0.15,
  consistency: 0.09,
  situation: 0.17,
  health: 0.08,
  durability: 0.14,
  rosterContext: 0.07,
  ageFactor: 0.08,
  slotValue: 0.08, // additive on top — total 1.08, not redistributed
};

// ─── Position-specific age curve parameters ───
// primeStart/primeEnd: plateau at 1.0. cliff: onset of accelerated decline.
// declineRate: quadratic exponential decay rate past the cliff.
const AGE_CURVES = {
  QB:  { primeStart: 26, peak: 30, primeEnd: 34, cliff: 38, declineRate: 0.06 },
  RB:  { primeStart: 22, peak: 25, primeEnd: 27, cliff: 29, declineRate: 0.14 },
  WR:  { primeStart: 24, peak: 27, primeEnd: 30, cliff: 32, declineRate: 0.09 },
  TE:  { primeStart: 25, peak: 28, primeEnd: 30, cliff: 32, declineRate: 0.18 },
  K:   { primeStart: 25, peak: 31, primeEnd: 36, cliff: 40, declineRate: 0.04 },
};

/**
 * Age-based recovery factor for injury/durability discounting.
 * Young players in their prime recover from injuries — their missed time
 * is more likely a fluke than structural decline. Older players past their
 * prime get little to no recovery benefit.
 *
 * Returns 0-0.50: fraction of the durability/consistency penalty to recover.
 */
function getAgeRecoveryFactor(age, pos) {
  if (pos === 'DEF' || age === null) return 0.0;
  const curve = AGE_CURVES[pos];
  if (!curve) return 0.0;

  const primeCenter = (curve.primeStart + curve.primeEnd) / 2;

  if (age < curve.primeStart) return 0.50;  // Pre-prime: young bodies heal fast
  if (age <= primeCenter)     return 0.40;  // Early prime: strong recovery
  if (age <= curve.primeEnd)  return 0.25;  // Late prime: moderate recovery
  if (age <= curve.cliff)     return 0.10;  // Post-prime: minimal recovery
  return 0.0;                               // Past cliff: injuries = decline
}

/**
 * Adjust season-aggregate share metrics for games played.
 * Mirrors the same logic in statProduction.js for X-Factor calculations.
 */
function adjustShareForGP(shareValue, gp, maxGP = 17) {
  if (!shareValue || !gp || gp >= maxGP * 0.75) return shareValue;
  const scaleFactor = Math.min(2.0, maxGP / gp);
  return shareValue * scaleFactor * 0.85;
}

function calcAgeFactor(age, pos) {
  if (pos === 'DEF' || age === null) return 1.0;

  const curve = AGE_CURVES[pos];
  if (!curve) return 1.0;

  // Phase 2: Prime plateau — full value
  if (age >= curve.primeStart && age <= curve.primeEnd) {
    return 1.0;
  }

  // Phase 1: Rising toward prime — gentle ramp
  if (age < curve.primeStart) {
    const yearsUntilPrime = curve.primeStart - age;
    return Math.max(0.70, 1.0 - (yearsUntilPrime * 0.03));
  }

  // Phase 3: Post-prime decline
  const yearsPastPrime = age - curve.primeEnd;
  const yearsToCliff = curve.cliff - curve.primeEnd;

  if (age <= curve.cliff) {
    // Gradual linear decline between primeEnd and cliff
    const linearDecay = yearsPastPrime * (0.20 / yearsToCliff);
    return Math.max(0.10, 1.0 - linearDecay);
  }

  // Past cliff: quadratic exponential dropoff
  const yearsPastCliff = age - curve.cliff;
  const cliffValue = 0.80;
  return Math.max(0.05, cliffValue * Math.exp(-curve.declineRate * yearsPastCliff * yearsPastCliff));
}

// ─── Pre-compute position groups ───

function buildPositionGroups(players, preset) {
  const profile = getScoringProfile(preset);
  const groups = {};
  players.forEach(p => {
    if (!groups[p.pos]) groups[p.pos] = [];
    groups[p.pos].push(p);
  });
  Object.keys(groups).forEach(pos => {
    const mult = profile.prodMultiplier[pos] || 1.0;
    groups[pos].sort((a, b) => (rawProduction(b) * mult) - (rawProduction(a) * mult));
  });
  return groups;
}

function rawProduction(p) {
  // Stat-based production: multi-dimensional sub-score from real stats.
  // calcStatProduction handles historical blending (65/20/10/5 year weights)
  // and 60/40 historical vs current-season blend internally.
  return calcStatProduction(p);
}

// ─── Dimension calculators ───

// SOS adjustment: players who faced easy schedules get production discounted.
// sosRank 1 (easiest) → 0.94 multiplier, sosRank 32 (hardest) → 1.06 multiplier.
// Neutral at rank 16-17. Range is intentionally narrow (±6%) — SOS is a tiebreaker, not dominant.
function getSosMultiplier(team) {
  const profile = TEAM_PROFILES[team];
  if (!profile || !profile.sosRank) return 1.0;
  // Normalize 1-32 to -1..+1, then scale to ±0.06
  return 1.0 + ((profile.sosRank - 16.5) / 15.5) * 0.06;
}

function calcProduction(player, posGroup, preset) {
  const profile = getScoringProfile(preset);
  const mult = profile.prodMultiplier[player.pos] || 1.0;
  const sosMult = getSosMultiplier(player.team);
  const raw = rawProduction(player) * mult * sosMult;
  const values = posGroup.map(p => rawProduction(p) * mult * getSosMultiplier(p.team));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  return range > 0 ? (raw - min) / range : 0.5;
}

function calcScarcity(player, posGroup) {
  const count = posGroup.length;
  if (count <= 1) return 1.0;
  const rank = posGroup.indexOf(player) + 1;
  // Pure positional rank: best = 1.0, worst ≈ 0.
  // "How many players at your position would you drop before this one?"
  return (count - rank) / (count - 1);
}

function calcConsistency(player, age = null, pos = null) {
  const history = _historicalData?.players?.[player.id];
  if (!history) {
    // No history: use current-season GP as sole availability signal
    const gp = player.gp || 0;
    return Math.min(1, gp / 17) * 0.50 + 0.50 * 0.50; // neutral production consistency
  }

  const years = Object.keys(history).map(Number).sort((a, b) => b - a);
  if (years.length === 0) return 0.50;

  // Availability Consistency (50%): how reliably does this player play 17 games?
  const gpScores = years.map(y => Math.min(1, (history[String(y)]?.gp || 0) / 17));
  const avgAvail = gpScores.reduce((s, v) => s + v, 0) / gpScores.length;
  let availCV = 0;
  if (gpScores.length >= 2 && avgAvail > 0) {
    const variance = gpScores.reduce((s, v) => s + Math.pow(v - avgAvail, 2), 0) / gpScores.length;
    availCV = Math.sqrt(variance) / avgAvail;
  }
  const availabilityConsistency = Math.max(0, Math.min(1, avgAvail * (1 - availCV)));

  // Production Consistency (50%): how stable is season-to-season output?
  const seasonProds = years
    .map(y => history[String(y)])
    .filter(s => s && s.gp >= 4) // filter cup-of-coffee seasons
    .map(s => s.avgPts || 0)
    .filter(v => v > 0);

  let productionConsistency = 0.50; // neutral default (rookies, 1-season players)
  if (seasonProds.length >= 2) {
    const mean = seasonProds.reduce((s, v) => s + v, 0) / seasonProds.length;
    if (mean > 0) {
      const variance = seasonProds.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / seasonProds.length;
      const cv = Math.sqrt(variance) / mean;
      productionConsistency = Math.max(0, Math.min(1, 1 - cv * 1.5));
    }
  }

  // Age-mitigated availability: young prime-age players recover a portion of
  // the availability penalty — missing games at 25 is less predictive than at 32.
  const ageRecovery = getAgeRecoveryFactor(age, pos);
  const adjustedAvailability = availabilityConsistency + (1.0 - availabilityConsistency) * ageRecovery * 0.5;

  return (adjustedAvailability * 0.50) + (productionConsistency * 0.50);
}

// ─── Situation Score ───
// Captures the offensive context a player operates in.

const TE_USAGE_MAP = { high: 1.0, medium: 0.65, low: 0.35 };

function calcSituation(player, allPlayers) {
  const teamProfile = TEAM_PROFILES[player.team];
  if (!teamProfile) return 0.50; // unknown team = neutral

  const schemeFit = SCHEME_FIT[teamProfile.schemeType] || {};
  const oLineNorm = 1 - (teamProfile.oLineRank - 1) / 31;
  let score = 0.50; // default neutral

  switch (player.pos) {
    case 'WR':
      score =
        (teamProfile.qbRating * 0.35) +
        (teamProfile.passRate * 0.25) +
        (teamProfile.passEfficiency * 0.15) +
        (teamProfile.tempoScore * 0.10) +
        ((schemeFit.WR || 0.65) * 0.15);
      break;

    case 'RB':
      score =
        (teamProfile.rushRate * 0.30) +
        (teamProfile.rushEfficiency * 0.20) +
        (oLineNorm * 0.20) +
        ((schemeFit.RB || 0.70) * 0.15) +
        (teamProfile.tempoScore * 0.15);
      break;

    case 'QB': {
      // Weapons quality: sum of top-3 WR + TE1 HexScores on same team (use raw production as proxy)
      const teammates = allPlayers.filter(p => p.team === player.team && p.id !== player.id);
      const wrScores = teammates.filter(p => p.pos === 'WR').map(p => rawProduction(p)).sort((a, b) => b - a);
      const teScores = teammates.filter(p => p.pos === 'TE').map(p => rawProduction(p)).sort((a, b) => b - a);
      const topWeapons = [...wrScores.slice(0, 3), ...(teScores[0] ? [teScores[0]] : [])];
      const weaponsRaw = topWeapons.reduce((s, v) => s + v, 0);
      const weaponsNorm = Math.min(1, weaponsRaw / 60); // ~60 pts from 4 weapons = elite

      const schemeAggression = schemeFit.QB || 0.60;
      score =
        (oLineNorm * 0.30) +
        (weaponsNorm * 0.30) +
        (schemeAggression * 0.20) +
        (teamProfile.tempoScore * 0.20);
      break;
    }

    case 'TE': {
      const teUsage = TE_USAGE_MAP[teamProfile.teUsage] || 0.50;
      // Competition factor: if team lacks elite WRs, TE gets more targets
      // Capped lower than before — even favorable target share doesn't make a TE as
      // valuable as an elite skill player. The old 0.90 ceiling was too generous.
      const teamWrs = allPlayers.filter(p => p.team === player.team && p.pos === 'WR');
      const topWrProd = teamWrs.length > 0 ? Math.max(...teamWrs.map(rawProduction)) : 0;
      const competitionFactor = topWrProd > 15 ? 0.35 : topWrProd > 10 ? 0.50 : 0.65;

      score =
        (teUsage * 0.40) +
        (teamProfile.qbRating * 0.25) +
        (teamProfile.passRate * 0.20) +
        (competitionFactor * 0.15);
      break;
    }

    default: // K, DEF
      score = 0.50;
  }

  // Apply dynamic situation events (news-driven) first, then static fallback
  const dynamicChange =
    _dynamicSituationChanges.find(c => c.playerId === player.id) ||
    _dynamicSituationChanges.find(c => !c.playerId && c.team === player.team && c.eventType?.endsWith('_cascade'));
  const staticChange = SITUATION_CHANGES.find(c => c.playerId === player.id);
  const change = dynamicChange || staticChange;
  if (change) {
    score = Math.max(0, Math.min(1, score + change.impact));
  }

  return score;
}

function calcHealth(player) {
  return HEALTH_MULTIPLIERS[player.status] || 0.5;
}

// ─── Durability from Real GP Data ───
// Replaces the fabricated injuryProfiles.js data with actual games-played
// from HISTORICAL_STATS across the most recent 3 seasons.

function calcDurabilityFromHistory(playerId) {
  const history = _historicalData?.players?.[playerId];
  if (!history) return 0.70; // unknown = slightly below average

  const years = Object.keys(history).map(Number).sort((a, b) => b - a);
  const recentYears = years.slice(0, 3);
  if (recentYears.length === 0) return 0.70;

  // Raw availability: games played / max possible (17 per season)
  const totalGP = recentYears.reduce((sum, y) => sum + (history[String(y)]?.gp || 0), 0);
  const maxGP = recentYears.length * 17;
  const availability = totalGP / maxGP;

  // Trend bonus: reward improving GP, penalize declining
  let trendBonus = 0;
  if (recentYears.length >= 2) {
    const recentGP = history[String(recentYears[0])]?.gp || 0;
    const priorGP = history[String(recentYears[1])]?.gp || 0;
    if (recentGP > priorGP) trendBonus = 0.03;
    else if (recentGP < priorGP - 3) trendBonus = -0.05;
  }

  // Severity proxy: seasons with GP <= 8 count as major miss events
  const majorMisses = recentYears.filter(y => (history[String(y)]?.gp || 0) <= 8).length;
  const severityPenalty = majorMisses * 0.08;

  return Math.max(0.10, Math.min(1.0, availability + trendBonus - severityPenalty));
}

function calcRosterContext(player, rosterPlayerIds, allPlayers) {
  if (!rosterPlayerIds || rosterPlayerIds.length === 0) return 1.0;
  const counts = {};
  rosterPlayerIds.forEach(id => {
    const p = allPlayers.find(pl => pl.id === id);
    if (p) counts[p.pos] = (counts[p.pos] || 0) + 1;
  });
  const have = counts[player.pos] || 0;
  const ideal = IDEAL_ROSTER[player.pos] || 2;
  const deficit = Math.max(0, ideal - have);
  return 1.0 + (Math.min(deficit, 2) * 0.125);
}

// ─── Slot Value ───
// Computes positional value from roster economics: how many slots can you fill,
// how much demand vs supply exists, how risky is the position, and how much
// raw production does the position generate?

const _slotValueCache = {};

function calcSlotValue(pos, scoringPreset) {
  const cacheKey = `${pos}_${scoringPreset}`;
  if (_slotValueCache[cacheKey] !== undefined) return _slotValueCache[cacheKey];

  const profile = getScoringProfile(scoringPreset);
  const overrides = profile.slotValueOverrides || {};

  // Determine which roster preset maps to this scoring format
  const rosterKey = scoringPreset === 'superflex' ? 'superflex'
    : scoringPreset === 'twoQb' ? 'twoQb'
    : scoringPreset === 'bestBall' ? 'bestBall'
    : scoringPreset === 'dynasty' ? 'dynasty'
    : 'standard';
  const roster = ROSTER_PRESETS[rosterKey] || ROSTER_PRESETS.standard;

  const allPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  // Helper: count eligible slots for a given position
  function countEligible(p) {
    const dedicated = overrides.dedicatedOverride?.[p] ?? (roster[p] || 0);
    let flex = 0;
    for (const [slotType, eligible] of Object.entries(FLEX_SLOT_ELIGIBILITY)) {
      const extra = overrides.extraFlexSlots?.[p] || [];
      if (eligible.includes(p) || extra.includes(slotType)) {
        flex += (roster[slotType] || 0);
      }
    }
    return dedicated + flex;
  }

  const totalEligible = countEligible(pos);
  const maxEligible = Math.max(...allPositions.map(countEligible));

  // 1. Slot eligibility: what fraction of the max slots can this position fill?
  const slotEligibility = maxEligible > 0 ? totalEligible / maxEligible : 0.5;

  // 2. Demand pressure: effective demand (including flex competition) vs supply
  const curve = getScarcityCurve(pos);
  const dedicated = overrides.dedicatedOverride?.[pos] ?? (roster[pos] || 0);
  const isFlexEligible = Object.values(FLEX_SLOT_ELIGIBILITY).some(e => e.includes(pos));
  const flexSlots = totalEligible - dedicated;
  const flexCompetition = isFlexEligible ? 0.33 : 0; // 3-way share of flex
  const effectiveDemand = DEFAULT_LEAGUE_SIZE * (dedicated + (flexSlots * flexCompetition));
  const demandRatio = curve.startable > 0 ? effectiveDemand / curve.startable : 1.0;
  const demandPressure = Math.min(1.0, demandRatio * 0.5);

  // 3. Attrition: position-level injury risk (higher = scarcer healthy players)
  const attrition = POSITION_ATTRITION[pos] || 0.50;

  // 4. Production profile: raw point output characteristics
  const prodProfile = overrides.productionOverride?.[pos] ?? (PRODUCTION_PROFILE[pos] || 0.50);

  const sw = SLOT_SUB_WEIGHTS;
  const value = (slotEligibility * sw.eligibility) +
    (demandPressure * sw.demand) +
    (attrition * sw.attrition) +
    (prodProfile * sw.production);

  _slotValueCache[cacheKey] = value;
  return value;
}

// ─── X-Factor (Usage Rating) ───
// Measures how much a team relies on a specific player using real inline stats
// from the player object (carries, tgtShare, airShare, wopr, rushYds, etc.)
// instead of the separately-maintained playerUsage.js file.

function calcXFactor(player) {
  const gp = player.gp || 1;

  switch (player.pos) {
    case 'QB': {
      // QB X-Factor = rushing involvement (dual-threat premium)
      const rushYdsPerGm = (player.rushYds || 0) / gp;
      const rushTdPerGm = (player.rushTd || 0) / gp;
      const carriesPerGm = (player.carries || 0) / gp;
      const rushEpaPerGm = (player.rushEpa || 0) / gp;
      return Math.min(1.0,
        (Math.min(1, rushYdsPerGm / 40) * 0.35) +
        (Math.min(1, rushTdPerGm / 0.5) * 0.25) +
        (Math.min(1, carriesPerGm / 7) * 0.20) +
        (Math.min(1, Math.max(0, rushEpaPerGm) / 3) * 0.20)
      );
    }
    case 'RB': {
      // RB X-Factor = workload dominance + receiving role
      const carriesPerGm = (player.carries || 0) / gp;
      const tgtShare = adjustShareForGP(player.tgtShare || 0, gp);
      const recPerGm = (player.rec || 0) / gp;
      return Math.min(1.0,
        (Math.min(1, carriesPerGm / 20) * 0.40) +
        (Math.min(1, tgtShare / 0.18) * 0.35) +
        (Math.min(1, recPerGm / 5) * 0.25)
      );
    }
    case 'WR': {
      // WR X-Factor = target dominance + air yards share + WOPR
      const tgtShare = adjustShareForGP(player.tgtShare || 0, gp);
      const airShare = adjustShareForGP(player.airShare || 0, gp);
      const wopr = adjustShareForGP(player.wopr || 0, gp);
      return Math.min(1.0,
        (Math.min(1, tgtShare / 0.28) * 0.40) +
        (Math.min(1, airShare / 0.35) * 0.25) +
        (Math.min(1, wopr / 0.70) * 0.35)
      );
    }
    case 'TE': {
      // TE X-Factor = target dominance (different thresholds than WR)
      const tgtShare = adjustShareForGP(player.tgtShare || 0, player.gp || 1);
      const recPerGm = (player.rec || 0) / gp;
      return Math.min(1.0,
        (Math.min(1, tgtShare / 0.22) * 0.55) +
        (Math.min(1, recPerGm / 7) * 0.45)
      );
    }
    default:
      return 0.5;
  }
}

// ─── Draft Value ───
// Determines if a player is worth spending a draft pick on, based on their
// rank within their position group vs the draftable depth threshold.
// Within draftable range: smooth curve from 1.0 (rank 1) to 0.5 (last draftable).
// Beyond draftable: sharp exponential dropoff that caps effective HexScore below 50.

function calcDraftValue(player, posGroup) {
  const rank = posGroup.indexOf(player) + 1;
  const draftable = getDraftableDepth(player.pos);

  if (rank <= draftable) {
    // Top 5 at any position get full value — no penalty for being elite
    if (rank <= 5) return 1.0;
    // Ranks 6+: sqrt curve separates mid-pack from elite
    const pct = (rank - 5) / (draftable - 5 || 1);
    return Math.max(0.45, 1.0 - (Math.sqrt(pct) * 0.55));
  }

  // Non-draftable: sharp dropoff — backups get crushed
  const overshoot = rank - draftable;
  return Math.max(0.05, 0.40 * Math.exp(-0.15 * overshoot));
}

// ─── Elite floor protection ───
// Historically elite players (by peak avgPts in last 3 seasons) get a minimum
// HexScore floor that decays 15% per year since their peak. Prevents a single
// down season from cratering a proven player to replacement level.

const FLOOR_THRESHOLDS = {
  QB:  { elite: 23, starter: 18, flex: 14 },
  RB:  { elite: 18, starter: 14, flex: 10 },
  WR:  { elite: 16, starter: 12, flex: 9 },
  TE:  { elite: 14, starter: 10, flex: 7 },
};

function calcHistoricalPeakFloor(playerId, pos, currentScore) {
  // Past-cliff players get no floor protection — the age decline is structural
  const age = getPlayerAge(playerId);
  const ageCurve = AGE_CURVES[pos];
  if (age !== null && ageCurve && age > ageCurve.cliff) return 0;

  const history = _historicalData?.players?.[playerId];
  if (!history) return 0;

  const years = Object.keys(history).map(Number).sort((a, b) => b - a);
  const recentYears = years.slice(0, 2);

  // Find peak season avgPts (must have played 8+ games to count)
  const peakAvg = Math.max(0, ...recentYears
    .map(y => history[String(y)])
    .filter(s => s && s.gp >= 8)
    .map(s => s.avgPts || 0));

  if (peakAvg === 0) return 0;

  const thresholds = FLOOR_THRESHOLDS[pos];
  if (!thresholds) return 0;

  let floorScore;
  if (peakAvg >= thresholds.elite) {
    floorScore = 55;
  } else if (peakAvg >= thresholds.starter) {
    floorScore = 42;
  } else if (peakAvg >= thresholds.flex) {
    floorScore = 32;
  } else {
    return 0;
  }

  // Decay the floor 15% per year since the peak season
  const peakYear = recentYears.find(y => {
    const s = history[String(y)];
    return s && s.gp >= 8 && (s.avgPts || 0) === peakAvg;
  });
  const currentYear = Math.max(...years);
  const yearsSincePeak = peakYear ? (currentYear - peakYear) : 2;
  const decayedFloor = floorScore * Math.pow(0.80, yearsSincePeak);

  return decayedFloor > currentScore ? decayedFloor : 0;
}

// ─── Pedigree Bonus ───
// Protection system for proven elite players having an anomalous down season.
// Only activates when a fluke is detected — stays dormant for players the
// algorithm already values correctly (consistent performers like Allen).

function calcPedigreeBonus(playerId, pos, archetypeKey) {
  const thresholds = PEDIGREE_THRESHOLDS[pos];
  if (!thresholds || !_historicalData?.players) return 0;

  const history = _historicalData.players[playerId];
  if (!history) return 0;

  const years = Object.keys(history).map(Number).sort((a, b) => a - b); // ascending for streak calc
  if (years.length === 0) return 0;

  const { strong, elite, dominant } = thresholds;

  // ─── Fluke gate ───
  // Only activate when the most recent qualifying season is anomalously low
  // relative to the player's established track record. If performance is
  // consistent, the base algorithm handles them correctly — no boost needed.
  const descYears = [...years].sort((a, b) => b - a);
  const qualifying = descYears
    .map(y => ({ year: y, avg: history[String(y)]?.avgPts || 0, gp: history[String(y)]?.gp || 0 }))
    .filter(s => s.gp >= 10);
  if (qualifying.length < 3) return 0; // not enough data to detect flukes

  // Trend guard: monotonic decline across last 3 qualifying seasons = real
  // regression, not a fluke. No pedigree bonus for players trending down.
  if (qualifying[0].avg < qualifying[1].avg && qualifying[1].avg < qualifying[2].avg) return 0;

  const recentAvg = qualifying[0].avg;
  const priorAvgs = qualifying.slice(1).map(s => s.avg).filter(v => v > 0);
  if (priorAvgs.length < 2) return 0;

  const sorted = [...priorAvgs].sort((a, b) => a - b);
  const priorMedian = sorted[Math.floor(sorted.length / 2)];
  const dropPct = priorMedian > 0 ? Math.max(0, (priorMedian - recentAvg) / priorMedian) : 0;
  if (dropPct <= 0.30) return 0; // no fluke — algorithm handles this player fine

  // 1. Elite Season Depth (weight: 0.35) — qualifying seasons with gp >= 10
  let depth = 0;
  for (const y of years) {
    const s = history[String(y)];
    if (!s || s.gp < 10) continue;
    const avg = s.avgPts || 0;
    if (avg >= elite) depth += 0.30;
    else if (avg >= strong) depth += 0.12;
  }
  depth = Math.min(1.0, depth);

  // 2. Consecutive Excellence (weight: 0.25) — longest streak of strong-or-better seasons
  let maxStreak = 0;
  let currentStreak = 0;
  for (const y of years) {
    const s = history[String(y)];
    if (s && s.gp >= 10 && (s.avgPts || 0) >= strong) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  const consecutiveBonus = Math.min(0.25, maxStreak * 0.08);

  // 3. Peak Dominance (weight: 0.30) — best single qualifying season
  const peakAvg = Math.max(0, ...years
    .map(y => history[String(y)])
    .filter(s => s && s.gp >= 10)
    .map(s => s.avgPts || 0));
  const peakDominance = peakAvg >= strong
    ? Math.min(1.0, (peakAvg - strong) / (dominant - strong))
    : 0;

  // 4. Archetype Quality (weight: 0.10)
  const archetypeQuality = ARCHETYPE_PEDIGREE[archetypeKey] ?? 0.40;

  // Track Record Dampener — fewer qualifying seasons = reduced confidence
  const qualifyingSeasons = years.filter(y => {
    const s = history[String(y)];
    return s && s.gp >= 10;
  }).length;
  if (qualifyingSeasons === 0) return 0;
  const trackRecord = Math.min(1.0, 0.38 + qualifyingSeasons * 0.16);

  const rawPedigree =
    (depth * 0.35) +
    consecutiveBonus +
    (peakDominance * 0.30) +
    (archetypeQuality * 0.10);

  return rawPedigree * trackRecord * MAX_PEDIGREE_BONUS;
}

// ─── Sigmoid shaping ───
// Steepness 8 with inflection at 0.40. The left-shifted inflection
// accommodates the additive slotValue (total weights = 1.08) and lets
// truly elite players (Bijan at raw ~0.99) reach 99.
function sigmoidShape(raw) {
  return 1 / (1 + Math.exp(-8 * (raw - 0.40)));
}

// ─── Main computation ───

export function computeAllHexScores(players = PLAYERS, rosterContext = null, scoringPreset = 'standard') {
  const posGroups = buildPositionGroups(players, scoringPreset);
  const results = new Map();

  // Determine if this is a PPR-family format
  const isPPR = ['ppr', 'halfPpr', 'tePremium'].includes(scoringPreset);

  // Resolve age weight — dynasty/keeper formats can override
  const profile = getScoringProfile(scoringPreset);
  const ageWeight = profile.ageWeightOverride || WEIGHTS.ageFactor;
  const baseAgeWeight = WEIGHTS.ageFactor;
  // When age is overridden, scale other weights proportionally to keep total = 1.0
  const nonAgeTotal = 1.0 - baseAgeWeight;
  const extraAge = ageWeight - baseAgeWeight;
  const weightScale = extraAge > 0 ? (nonAgeTotal - extraAge) / nonAgeTotal : 1.0;

  players.forEach(p => {
    const posGroup = posGroups[p.pos] || [p];
    const archetype = classifyArchetype(p, p.pos);

    // Base dimensions
    let production = calcProduction(p, posGroup, scoringPreset);
    const scarcity = calcScarcity(p, posGroup);
    const age = getPlayerAge(p.id);
    let consistency = calcConsistency(p, age, p.pos);
    const situation = calcSituation(p, players);
    const health = calcHealth(p);
    const rawDurability = calcDurabilityFromHistory(p.id);
    const context = calcRosterContext(p, rosterContext, players);
    const ageFactor = calcAgeFactor(age, p.pos);

    // Age-mitigated durability: young prime-age players recover a portion
    // of the durability penalty — a 25-year-old missing time to a freak
    // injury is fundamentally different from a 32-year-old breaking down.
    const ageRecovery = getAgeRecoveryFactor(age, p.pos);
    const durability = rawDurability + (1.0 - rawDurability) * ageRecovery;

    // Apply archetype adjustments
    // Fantasy premium boosts production (dual-threat QBs, bell-cow RBs, alpha WRs)
    production = Math.min(1, production * archetype.fantasyPremium);
    // Floor boost enhances consistency (high-floor players are more reliable)
    consistency = Math.min(1, consistency + archetype.floorBoost);
    // PPR format bonus (pass-catching players get extra value)
    const pprBonus = isPPR ? archetype.pprAdjust : 0;

    const slotValue = calcSlotValue(p.pos, scoringPreset);

    const rawBase =
      (production * WEIGHTS.production +
      scarcity * WEIGHTS.scarcity +
      consistency * WEIGHTS.consistency +
      situation * WEIGHTS.situation +
      health * WEIGHTS.health +
      durability * WEIGHTS.durability +
      (context * WEIGHTS.rosterContext) +
      slotValue * WEIGHTS.slotValue) * weightScale +
      ageFactor * ageWeight +
      pprBonus;

    // X-Factor: usage/target share multiplier — hyper-targeted players get boosted
    const xFactor = calcXFactor(p);
    const xFactorMultiplier = 0.85 + (xFactor * 0.25); // scales 0.85 (low usage) → 1.10 (hyper-targeted)
    const rawXFactored = rawBase * xFactorMultiplier;

    // Draft value: multiplier based on position rank vs draftable depth.
    // Non-draftable players (backups beyond threshold) get crushed below 50.
    const draftValue = calcDraftValue(p, posGroup);
    const raw = rawXFactored * draftValue;

    let hexScore = parseFloat((sigmoidShape(raw) * 100).toFixed(3));

    // Elite floor protection: historically elite players don't fall below a tier-appropriate minimum.
    const peakFloor = calcHistoricalPeakFloor(p.id, p.pos, hexScore);
    if (peakFloor > hexScore) {
      hexScore = peakFloor;
    }

    // Pedigree bonus: post-sigmoid additive reward for sustained elite performance.
    // K/DEF excluded — no historical pedigree signal for those positions.
    const pedigreeBonus = (p.pos === 'K' || p.pos === 'DEF')
      ? 0
      : calcPedigreeBonus(p.id, p.pos, archetype.key);
    hexScore = Math.min(99.999, hexScore + pedigreeBonus);

    // Hard cap for K/DEF — no kicker or defense above 60
    const posCap = POSITION_HEXSCORE_CAP[p.pos];
    if (posCap && hexScore > posCap) hexScore = posCap;

    results.set(p.id, {
      hexScore,
      archetype: archetype.key,
      dimensions: { production, scarcity, consistency, situation, health, durability, context, ageFactor, slotValue, xFactor, draftValue },
      tier: getHexTier(hexScore),
      pedigreeBonus,
    });
  });

  return results;
}

export function getLeagueHexScores(scoringPreset = 'standard') {
  if (!_hexCache[scoringPreset]) {
    _hexCache[scoringPreset] = computeAllHexScores(PLAYERS, null, scoringPreset);
  }
  return _hexCache[scoringPreset];
}

// ─── Tier classification ───

export function getHexTier(score) {
  if (score >= 85) return { tier: 'Elite', cssClass: 'hex-elite' };
  if (score >= 75) return { tier: 'Starter+', cssClass: 'hex-starter-plus' };
  if (score >= 60) return { tier: 'Starter', cssClass: 'hex-starter' };
  if (score >= 45) return { tier: 'Flex', cssClass: 'hex-flex' };
  if (score >= 35) return { tier: 'Bench', cssClass: 'hex-bench' };
  if (score >= 20) return { tier: 'Depth', cssClass: 'hex-depth' };
  return { tier: 'Waiver', cssClass: 'hex-waiver' };
}

// ─── Trade utilities ───

const STARTER_SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };
const FLEX_ELIGIBLE = ['RB', 'WR', 'TE'];

// ─── Replacement-level trade value ───
// Players below replacement level are waiver-wire replaceable and have near-zero
// trade value. The curve zeroes out quickly below the startable threshold.
// Kickers and DEFs are heavily discounted — nearly anyone on the wire is "good enough."

const REPLACEMENT_THRESHOLDS = {
  QB:  { startable: 55, replacement: 35 },
  RB:  { startable: 50, replacement: 30 },
  WR:  { startable: 50, replacement: 30 },
  TE:  { startable: 50, replacement: 30 },
  K:   { startable: 70, replacement: 55 },
  DEF: { startable: 65, replacement: 50 },
};

// Kickers and DEFs are almost always waiver-replaceable. Only truly elite ones
// carry meaningful trade capital. This multiplier stacks with replacement decay.
const POSITION_TRADE_DISCOUNT = { K: 0.15, DEF: 0.20 };

function replacementLevelDecay(hexScore, pos) {
  const thresholds = REPLACEMENT_THRESHOLDS[pos];
  if (!thresholds) return hexScore;

  // Above startable: full value, no decay
  if (hexScore >= thresholds.startable) return hexScore;

  // Between replacement and startable: steep curve toward zero
  if (hexScore >= thresholds.replacement) {
    const range = thresholds.startable - thresholds.replacement;
    const above = hexScore - thresholds.replacement;
    // Quadratic decay — drops fast near the bottom
    const pct = (above / range);
    return hexScore * (pct * pct);
  }

  // Below replacement level: virtually worthless in a trade
  return hexScore * 0.02;
}

function applyTradeDiscounts(tradeValue, pos) {
  const discount = POSITION_TRADE_DISCOUNT[pos];
  if (discount) tradeValue *= discount;
  return tradeValue;
}

function contextualTradeValue(playerId, receivingRoster, outgoingIds = [], scoringPreset = 'standard') {
  const hexScores = getLeagueHexScores(scoringPreset);
  const baseEntry = hexScores.get(playerId);
  if (!baseEntry) return 0;
  const base = baseEntry.hexScore;
  const player = PLAYER_MAP[playerId];
  if (!player) return base;

  const rosterAfter = receivingRoster.filter(id => !outgoingIds.includes(id));
  const rosterPlayers = rosterAfter.map(id => PLAYER_MAP[id]).filter(Boolean);

  const posPlayers = rosterPlayers.filter(p => p.pos === player.pos);
  const posScores = posPlayers.map(p => {
    const e = hexScores.get(p.id);
    return e ? e.hexScore : 0;
  }).sort((a, b) => b - a);

  const starterCount = STARTER_SLOTS[player.pos] || 0;
  const benchmarkScore = posScores[starterCount - 1] ?? 0;
  const wouldStart = base > benchmarkScore;

  const wouldFlex = !wouldStart && FLEX_ELIGIBLE.includes(player.pos) && (() => {
    const allFlexPlayers = rosterPlayers
      .filter(p => FLEX_ELIGIBLE.includes(p.pos))
      .map(p => {
        const e = hexScores.get(p.id);
        return { id: p.id, score: e ? e.hexScore : 0 };
      })
      .sort((a, b) => b.score - a.score);
    const totalFlexSlots = (STARTER_SLOTS.RB || 0) + (STARTER_SLOTS.WR || 0) + (STARTER_SLOTS.TE || 0) + 1;
    const flexCutoff = allFlexPlayers[totalFlexSlots - 1]?.score ?? 0;
    return base > flexCutoff;
  })();

  const IDEAL_DEPTH = { QB: 2, RB: 5, WR: 5, TE: 2, K: 1, DEF: 2 };
  const currentCount = posPlayers.length;
  const ideal = IDEAL_DEPTH[player.pos] || 2;
  const deficit = ideal - currentCount;

  let needMultiplier = 1.0;
  if (deficit >= 2)        needMultiplier = 1.30;
  else if (deficit >= 1)   needMultiplier = 1.15;
  else if (deficit === 0)  needMultiplier = 1.0;
  else if (deficit === -1) needMultiplier = 0.90;
  else                     needMultiplier = 0.80;

  let rolePremium = 1.0;
  if (wouldStart) {
    const upgradeDelta = base - (benchmarkScore || 0);
    rolePremium = 1.0 + Math.min(0.25, upgradeDelta * 0.0125);
  } else if (wouldFlex) {
    rolePremium = 0.85;
  } else {
    rolePremium = 0.40;
  }

  // Apply replacement-level decay and position discounts
  let tradeVal = replacementLevelDecay(base, player.pos) * needMultiplier * rolePremium;
  tradeVal = applyTradeDiscounts(tradeVal, player.pos);

  return Math.max(0, Math.min(150, Math.round(tradeVal)));
}

export function computeTradeValue(playerIds, scoringPreset = 'standard') {
  const hexScores = getLeagueHexScores(scoringPreset);
  return playerIds.reduce((sum, id) => {
    const entry = hexScores.get(id);
    if (!entry) return sum;
    const player = PLAYER_MAP[id];
    let val = replacementLevelDecay(entry.hexScore, player?.pos);
    val = applyTradeDiscounts(val, player?.pos);
    return sum + Math.round(val);
  }, 0);
}

// ─── Star-concentration adjustment ───
// When one side offers many low-value players against fewer high-value ones,
// the bulk side is penalized. Real trades require offering comparable talent,
// not a pile of waiver-level players for an elite asset.

function concentrationPenalty(ids, scoringPreset) {
  if (ids.length <= 1) return 1.0;
  const hexScores = getLeagueHexScores(scoringPreset);
  const scores = ids.map(id => {
    const entry = hexScores.get(id);
    const player = PLAYER_MAP[id];
    let val = entry ? replacementLevelDecay(entry.hexScore, player?.pos) : 0;
    val = applyTradeDiscounts(val, player?.pos);
    return val;
  }).sort((a, b) => b - a);

  const best = scores[0] || 0;
  const total = scores.reduce((s, v) => s + v, 0);
  if (total === 0) return 1.0;

  // What fraction of the package's value comes from the best player?
  // If the best player is < 40% of the total, the package is filler-heavy.
  const bestPct = best / total;
  if (bestPct >= 0.40) return 1.0;

  // Penalize proportionally: a package where the best is only 20% of total
  // (5 equally bad players) gets a 0.50 multiplier.
  return 0.50 + (bestPct / 0.40) * 0.50;
}

export function computeTradeTier(sendIds, receiveIds, userRoster = null, partnerRoster = null, scoringPreset = 'standard') {
  let sendTotal, receiveTotal;

  if (userRoster && partnerRoster) {
    sendTotal = sendIds.reduce((sum, id) => sum + contextualTradeValue(id, partnerRoster, receiveIds, scoringPreset), 0);
    receiveTotal = receiveIds.reduce((sum, id) => sum + contextualTradeValue(id, userRoster, sendIds, scoringPreset), 0);
  } else {
    sendTotal = computeTradeValue(sendIds, scoringPreset);
    receiveTotal = computeTradeValue(receiveIds, scoringPreset);
  }

  // Apply concentration penalty to each side
  sendTotal = Math.round(sendTotal * concentrationPenalty(sendIds, scoringPreset));
  receiveTotal = Math.round(receiveTotal * concentrationPenalty(receiveIds, scoringPreset));

  const total = sendTotal + receiveTotal;
  const delta = receiveTotal - sendTotal;
  const ratio = total > 0 ? delta / total : 0;

  let label, css;
  if (ratio >= 0.35)       { label = 'High Hex-Value';       css = 'fair'; }
  else if (ratio >= 0.25)  { label = 'Highly Favorable';     css = 'fair'; }
  else if (ratio >= 0.15)  { label = 'Favorable';            css = 'fair'; }
  else if (ratio >= 0.05)  { label = 'Slightly Favorable';   css = 'fair'; }
  else if (ratio >= -0.05) { label = 'Neutral';              css = 'uneven'; }
  else if (ratio >= -0.15) { label = 'Slightly Unfavorable'; css = 'uneven'; }
  else if (ratio >= -0.25) { label = 'Unfavorable';          css = 'lopsided'; }
  else if (ratio >= -0.35) { label = 'Highly Unfavorable';   css = 'lopsided'; }
  else                     { label = 'Low Hex-Value';        css = 'lopsided'; }

  return { sendTotal, receiveTotal, delta, ratio, label, css };
}

// ─── Convenience lookups (default = standard) ───

// Format a HexScore to always show 3 decimal places (e.g., 97.000, 85.234)
export function formatHex(score) {
  return Number(score).toFixed(3);
}

export function getHexScore(playerId, scoringPreset) {
  const scores = getLeagueHexScores(scoringPreset || 'standard');
  const entry = scores.get(playerId);
  return entry ? entry.hexScore : 0;
}

export function getHexData(playerId, scoringPreset) {
  const scores = getLeagueHexScores(scoringPreset || 'standard');
  return scores.get(playerId) || null;
}

// Legacy compat — lazy getter so it computes on first access, not at import time
let _defaultScores = null;
export function getDefaultHexScores() {
  if (!_defaultScores || !_hexCache['standard']) {
    _defaultScores = getLeagueHexScores('standard');
  }
  return _defaultScores;
}
