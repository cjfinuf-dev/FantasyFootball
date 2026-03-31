/**
 * HexScore — Proprietary Player Valuation Engine
 *
 * A seven-dimensional composite score (0-100) combining:
 *   1. Production (0.28) — 3-year weighted historical production, scoring-format adjusted
 *   2. Positional Scarcity (0.16) — exponential decay with position-specific curves
 *   3. Consistency (0.10) — inverse coefficient of variation
 *   4. Situation (0.18) — team scheme, QB quality, offensive context, situation changes
 *   5. Health (0.08) — current status-based discount
 *   6. Durability (0.13) — 3-year injury history: availability, frequency, severity
 *   7. Roster Context (0.07) — team need multiplier (optional)
 *
 * Scoring-format-aware: each league preset (PPR, standard, 6pt pass TD, etc.)
 * adjusts position production multipliers and scarcity curves.
 */

import { PLAYERS } from '../data/players';
import { computeDurability } from '../data/injuryProfiles';
import { getWeightedProduction } from '../data/historicalStats';
import { TEAM_PROFILES, SCHEME_FIT, SITUATION_CHANGES } from '../data/teamProfiles';
import { getPlayerArchetype } from '../data/playerArchetypes';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// ─── Base scarcity curve parameters ───
const SCARCITY_CURVES = {
  QB:  { k: 0.06, startable: 12 },
  RB:  { k: 0.10, startable: 24 },
  WR:  { k: 0.08, startable: 24 },
  TE:  { k: 0.14, startable: 12 },
  K:   { k: 0.04, startable: 12 },
  DEF: { k: 0.05, startable: 12 },
};

// ─── Scoring format profiles ───
// Each profile has:
//   prodMultiplier: per-position multiplier on production score
//   scarcityOverrides: per-position k-value overrides (merged with base)
const SCORING_PROFILES = {
  standard: {
    prodMultiplier: { QB: 1.0, RB: 1.15, WR: 0.95, TE: 0.90, K: 1.0, DEF: 1.0 },
    scarcityOverrides: { RB: { k: 0.12 } },
  },
  ppr: {
    prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.15, TE: 1.10, K: 1.0, DEF: 1.0 },
    scarcityOverrides: { TE: { k: 0.11 } },
  },
  halfPpr: {
    prodMultiplier: { QB: 1.0, RB: 1.05, WR: 1.08, TE: 1.05, K: 1.0, DEF: 1.0 },
    scarcityOverrides: {},
  },
  sixPtPassTd: {
    prodMultiplier: { QB: 1.25, RB: 0.95, WR: 0.95, TE: 0.95, K: 1.0, DEF: 1.0 },
    scarcityOverrides: { QB: { k: 0.09 } },
  },
  tePremium: {
    prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.10, TE: 1.30, K: 1.0, DEF: 1.0 },
    scarcityOverrides: { TE: { k: 0.08 } },
  },
  superflex: {
    prodMultiplier: { QB: 1.20, RB: 0.95, WR: 0.95, TE: 0.95, K: 1.0, DEF: 1.0 },
    scarcityOverrides: { QB: { k: 0.09 } },
  },
  dynasty: {
    prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.05, TE: 1.0, K: 0.80, DEF: 0.80 },
    scarcityOverrides: {},
  },
};

const DEFAULT_PROFILE = { prodMultiplier: { QB: 1.0, RB: 1.0, WR: 1.0, TE: 1.0, K: 1.0, DEF: 1.0 }, scarcityOverrides: {} };

function getScoringProfile(preset) {
  return SCORING_PROFILES[preset] || DEFAULT_PROFILE;
}

function getScarcityCurve(pos, preset) {
  const base = SCARCITY_CURVES[pos] || { k: 0.08, startable: 12 };
  const profile = getScoringProfile(preset);
  const override = profile.scarcityOverrides[pos];
  return override ? { ...base, ...override } : base;
}

// ─── Other constants ───

const HEALTH_MULTIPLIERS = {
  healthy: 1.0,
  questionable: 0.75,
  doubtful: 0.40,
  out: 0.10,
  ir: 0.05,
};

const IDEAL_ROSTER = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DEF: 1 };

const WEIGHTS = {
  production: 0.28,
  scarcity: 0.16,
  consistency: 0.10,
  situation: 0.18,
  health: 0.08,
  durability: 0.13,
  rosterContext: 0.07,
};

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
  // Use 3-year weighted historical production, with current-week proj as a tiebreaker
  const historical = getWeightedProduction(p.id);
  // Blend: 80% historical trajectory, 20% current-week projection
  return (historical * 0.80) + (p.proj * 0.20);
}

// ─── Dimension calculators ───

function calcProduction(player, posGroup, preset) {
  const profile = getScoringProfile(preset);
  const mult = profile.prodMultiplier[player.pos] || 1.0;
  const raw = rawProduction(player) * mult;
  const values = posGroup.map(p => rawProduction(p) * mult);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  return range > 0 ? (raw - min) / range : 0.5;
}

function calcScarcity(player, posGroup, preset) {
  const curve = getScarcityCurve(player.pos, preset);
  const rank = posGroup.indexOf(player) + 1;
  const decay = Math.exp(-curve.k * (rank - 1));
  const starterBonus = rank <= curve.startable ? 1.0 : 0.7;
  return decay * starterBonus;
}

function calcConsistency(player) {
  const values = [player.pts, player.proj, player.avg];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;
  return Math.max(0, Math.min(1, 1 - (cv * 2)));
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
      const teamWrs = allPlayers.filter(p => p.team === player.team && p.pos === 'WR');
      const topWrProd = teamWrs.length > 0 ? Math.max(...teamWrs.map(rawProduction)) : 0;
      const competitionFactor = topWrProd > 15 ? 0.40 : topWrProd > 10 ? 0.65 : 0.90;

      score =
        (teUsage * 0.35) +
        (teamProfile.qbRating * 0.25) +
        (teamProfile.passRate * 0.20) +
        (competitionFactor * 0.20);
      break;
    }

    default: // K, DEF
      score = 0.50;
  }

  // Apply situation change events
  const change = SITUATION_CHANGES.find(c => c.playerId === player.id);
  if (change) {
    score = Math.max(0, Math.min(1, score + change.impact));
  }

  return score;
}

function calcHealth(player) {
  return HEALTH_MULTIPLIERS[player.status] || 0.5;
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

// ─── Sigmoid shaping ───
function sigmoidShape(raw) {
  return 1 / (1 + Math.exp(-8 * (raw - 0.5)));
}

// ─── Main computation ───

export function computeAllHexScores(players = PLAYERS, rosterContext = null, scoringPreset = 'standard') {
  const posGroups = buildPositionGroups(players, scoringPreset);
  const results = new Map();

  // Determine if this is a PPR-family format
  const isPPR = ['ppr', 'halfPpr', 'tePremium'].includes(scoringPreset);

  players.forEach(p => {
    const posGroup = posGroups[p.pos] || [p];
    const archetype = getPlayerArchetype(p.id, p.pos);

    // Base dimensions
    let production = calcProduction(p, posGroup, scoringPreset);
    const scarcity = calcScarcity(p, posGroup, scoringPreset);
    let consistency = calcConsistency(p);
    const situation = calcSituation(p, players);
    const health = calcHealth(p);
    const durability = computeDurability(p.id);
    const context = calcRosterContext(p, rosterContext, players);

    // Apply archetype adjustments
    // Fantasy premium boosts production (dual-threat QBs, bell-cow RBs, alpha WRs)
    production = Math.min(1, production * archetype.fantasyPremium);
    // Floor boost enhances consistency (high-floor players are more reliable)
    consistency = Math.min(1, consistency + archetype.floorBoost);
    // PPR format bonus (pass-catching players get extra value)
    const pprBonus = isPPR ? archetype.pprAdjust : 0;

    const raw =
      production * WEIGHTS.production +
      scarcity * WEIGHTS.scarcity +
      consistency * WEIGHTS.consistency +
      situation * WEIGHTS.situation +
      health * WEIGHTS.health +
      durability * WEIGHTS.durability +
      (context * WEIGHTS.rosterContext) +
      pprBonus;

    const hexScore = Math.round(sigmoidShape(raw) * 100);

    results.set(p.id, {
      hexScore,
      archetype: archetype.key,
      dimensions: { production, scarcity, consistency, situation, health, durability, context },
      tier: getHexTier(hexScore),
    });
  });

  return results;
}

// ─── Memoized per-preset cache ───
const _hexCache = {};

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
    rolePremium = 0.95;
  } else {
    rolePremium = 0.75;
  }

  const adjusted = Math.round(base * needMultiplier * rolePremium);
  return Math.max(0, Math.min(150, adjusted));
}

export function computeTradeValue(playerIds, scoringPreset = 'standard') {
  const hexScores = getLeagueHexScores(scoringPreset);
  return playerIds.reduce((sum, id) => {
    const entry = hexScores.get(id);
    return sum + (entry ? entry.hexScore : 0);
  }, 0);
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

export const HEX_SCORES = computeAllHexScores();

export function getHexScore(playerId, scoringPreset) {
  const scores = scoringPreset ? getLeagueHexScores(scoringPreset) : HEX_SCORES;
  const entry = scores.get(playerId);
  return entry ? entry.hexScore : 0;
}

export function getHexData(playerId, scoringPreset) {
  const scores = scoringPreset ? getLeagueHexScores(scoringPreset) : HEX_SCORES;
  return scores.get(playerId) || null;
}
