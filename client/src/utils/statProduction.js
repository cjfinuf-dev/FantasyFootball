/**
 * statProduction.js — Position-specific stat-based production scoring
 *
 * Replaces the avgPts-only production calculation with multi-dimensional
 * sub-scores built from real NFL statistics (passing, rushing, receiving,
 * kicking, efficiency metrics).
 *
 * Each position has a weighted sub-score formula that combines volume,
 * efficiency, and contextual metrics into a single 0-1 production score.
 *
 * Stats sources:
 *   - Current season: inline fields on player objects (players.js)
 *   - Historical seasons: per-year stats in historicalStats.js
 *   - Full detail: playerDetailedStats.js (used for historical sub-scores)
 */

import { PLAYER_DETAILED_STATS } from '../data/playerDetailedStats';
import { HISTORICAL_STATS } from '../data/historicalStats';
import { getPlayerAge } from '../data/playerAges';

// ─── Fluke Protection ────────────────────────────────────────────────────────
// Pedigree acts as a multiplier on fluke restoration: proven elite players get
// near-full restoration toward their historical baseline, unproven players get
// little. Age attenuates protection — prime-age players get full benefit,
// post-cliff players get none. The ceiling is the player's historical median
// (what their score would be if the fluke year didn't happen).

const FLUKE_AGE_CURVES = {
  QB:  { primeEnd: 34, cliff: 38 },
  RB:  { primeEnd: 27, cliff: 29 },
  WR:  { primeEnd: 30, cliff: 32 },
  TE:  { primeEnd: 30, cliff: 32 },
};

const FLUKE_PEDIGREE_THRESHOLDS = {
  QB:  { strong: 20, elite: 23, dominant: 25 },
  RB:  { strong: 14, elite: 18, dominant: 22 },
  WR:  { strong: 14, elite: 17, dominant: 20 },
  TE:  { strong: 12, elite: 15, dominant: 18 },
};

function calcAgeProtection(playerId, pos) {
  const age = getPlayerAge(playerId);
  if (age === null) return 0.70;
  const curve = FLUKE_AGE_CURVES[pos];
  if (!curve) return 0.0;
  if (age <= curve.primeEnd) return 1.0;
  if (age > curve.cliff) return 0.0;
  return 1.0 - (age - curve.primeEnd) / (curve.cliff - curve.primeEnd);
}

function calcPedigreeScore(playerId, pos) {
  const thresholds = FLUKE_PEDIGREE_THRESHOLDS[pos];
  if (!thresholds) return 0;

  const history = HISTORICAL_STATS?.players?.[playerId];
  if (!history) return 0;

  const years = Object.keys(history).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return 0;

  const { strong, elite, dominant } = thresholds;

  // Elite Season Depth (weight: 0.40)
  let depth = 0;
  for (const y of years) {
    const s = history[String(y)];
    if (!s || s.gp < 10) continue;
    const avg = s.avgPts || 0;
    if (avg >= elite) depth += 0.30;
    else if (avg >= strong) depth += 0.12;
  }
  depth = Math.min(1.0, depth);

  // Consecutive Excellence (weight: 0.25)
  let maxStreak = 0, currentStreak = 0;
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

  // Peak Dominance (weight: 0.35)
  const peakAvg = Math.max(0, ...years
    .map(y => history[String(y)])
    .filter(s => s && s.gp >= 10)
    .map(s => s.avgPts || 0));
  const peakDominance = peakAvg >= strong
    ? Math.min(1.0, (peakAvg - strong) / (dominant - strong))
    : 0;

  // Track Record dampener
  const qualifyingSeasons = years.filter(y => {
    const s = history[String(y)];
    return s && s.gp >= 10;
  }).length;
  if (qualifyingSeasons === 0) return 0;
  const trackRecord = Math.min(1.0, 0.38 + qualifyingSeasons * 0.16);

  const rawPedigree =
    (depth * 0.40) +
    consecutiveBonus +
    (peakDominance * 0.35);

  return rawPedigree * trackRecord;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function safe(v, fallback = 0) {
  return v != null && isFinite(v) ? v : fallback;
}

function perGame(stat, gp) {
  return gp > 0 ? safe(stat) / gp : 0;
}

/**
 * Adjust season-aggregate share metrics (tgtShare, wopr, airShare) for players
 * who missed significant time. These metrics represent season-long share of team
 * targets/air yards, so a player missing 10 games will have a suppressed share
 * even if their per-game share was elite. This normalizes to approximate what
 * the share would have been over a full season.
 */
function adjustShareForGP(shareValue, gp, maxGP = 17) {
  if (!shareValue || !gp || gp >= maxGP * 0.75) return shareValue;
  // Cap the per-game-pace scale at 1.3× so small-sample breakouts don't get
  // extrapolated into full-season "elite" territory.
  const scaleFactor = Math.min(1.3, maxGP / gp);
  return shareValue * scaleFactor * 0.85;
}

// ─── QB Production Sub-Score ───────────────────────────────────────────────────
// 5 components using all individual QB stats.
// Team-context is handled by the situation dimension — production measures the player.
//
// Passing Output (30%)     — yards, TDs, first downs, 2pt conversions
// Passing Efficiency (25%) — CPOE, cmp%, PACR, yds/att
// Rushing Contribution (20%) — rush yards, TDs, first downs, EPA, 2pt
// Pocket Presence (15%)    — sack avoidance, sack fumble rate, sack yds lost
// Ball Security (10%)      — INT rate, fumble rate

function calcQBProduction(s, gp) {
  if (!gp || gp === 0) return 0;

  const cmp = safe(s.cmp || s.completions);
  const att = safe(s.att || s.attempts);
  const sacks = safe(s.sacks || s.sacksSuffered);
  const dropbacks = att + sacks;

  // ── Passing Output (30%) ──
  const passYdsPerGm = perGame(s.passYds || s.passingYards, gp);
  const passTdPerGm = perGame(s.passTd || s.passingTds, gp);
  const passFirstDownsPerGm = perGame(s.passingFirstDowns, gp);
  const passing2ptPerGm = perGame(s.passing2pt, gp);
  const passingOutput = clamp(
    (clamp(passYdsPerGm / 300) * 0.40) +
    (clamp(passTdPerGm / 2.5) * 0.30) +
    (clamp(passFirstDownsPerGm / 18) * 0.20) +
    (clamp(passing2ptPerGm / 0.15) * 0.10)
  );

  // ── Passing Efficiency (25%) ──
  const cpoe = safe(s.cpoe || s.passingCpoe);
  const cmpPct = att > 0 ? (cmp / att - 0.58) / 0.12 : 0;
  const pacr = safe(s.pacr);
  const ydsPerAtt = att > 0 ? safe(s.passYds || s.passingYards) / att : 0;
  const passingEfficiency = clamp(
    (clamp(cpoe / 8) * 0.30) +
    (clamp(cmpPct) * 0.25) +
    (clamp(pacr / 0.8) * 0.25) +
    (clamp(ydsPerAtt / 8.5) * 0.20)
  );

  // ── Rushing Contribution (20%) ──
  const rushYdsPerGm = perGame(s.rushYds || s.rushingYards, gp);
  const rushTdPerGm = perGame(s.rushTd || s.rushingTds, gp);
  const rushFirstDownsPerGm = perGame(s.rushingFirstDowns, gp);
  const rushEpaPerGm = perGame(s.rushEpa || s.rushingEpa, gp);
  const rushing2ptPerGm = perGame(s.rushing2pt, gp);
  const rushingContribution = clamp(
    (clamp(rushYdsPerGm / 50) * 0.40) +
    (clamp(rushTdPerGm / 0.5) * 0.25) +
    (clamp(rushFirstDownsPerGm / 2.5) * 0.15) +
    (clamp(Math.max(0, rushEpaPerGm) / 2) * 0.15) +
    (clamp(rushing2ptPerGm / 0.1) * 0.05)
  );

  // ── Pocket Presence (15%) ──
  const sackRate = dropbacks > 0 ? sacks / dropbacks : 0;
  const sackFumbles = safe(s.sackFumbles || s.sackFumblesLost);
  const sackFumbleRate = dropbacks > 0 ? sackFumbles / dropbacks : 0;
  const sackYdsLostPerGm = perGame(s.sackYardsLost || s.sackYdsLost, gp);
  const pocketPresence = clamp(
    (clamp(1 - sackRate / 0.10) * 0.50) +
    (clamp(1 - sackFumbleRate / 0.03) * 0.30) +
    (clamp(1 - sackYdsLostPerGm / 25) * 0.20)
  );

  // ── Ball Security (10%) ──
  const intRate = att > 0 ? safe(s.int || s.passingInt) / att : 0;
  const totalFumLost = safe(s.sackFumblesLost) + safe(s.rushingFumblesLost);
  const fumLostRate = dropbacks > 0 ? totalFumLost / dropbacks : 0;
  const ballSecurity = clamp(
    (clamp(1 - intRate / 0.04) * 0.70) +
    (clamp(1 - fumLostRate / 0.02) * 0.30)
  );

  return (
    passingOutput * 0.30 +
    passingEfficiency * 0.25 +
    rushingContribution * 0.20 +
    pocketPresence * 0.15 +
    ballSecurity * 0.10
  );
}

// ─── RB Production Sub-Score ───────────────────────────────────────────────────
// 6 components using all individual RB stats.
//
// Rushing Output (28%)       — yards, TDs, first downs, 2pt
// Receiving Value (22%)      — yards, receptions, TDs, first downs, 2pt
// Opportunity Share (18%)    — carries/gm, target share, air yards share, WOPR
// Rushing Efficiency (14%)   — yds/carry, first downs/carry, rush EPA/gm
// Receiving Efficiency (12%) — yds/tgt, catch rate, YAC/rec
// Ball Security (6%)         — fumbles lost per touch

function calcRBProduction(s, gp) {
  if (!gp || gp === 0) return 0;

  const carries = safe(s.carries);
  const rec = safe(s.rec || s.receptions);
  const tgt = safe(s.tgt || s.targets);
  const touches = carries + rec;
  const recYds = safe(s.recYds || s.receivingYards);
  const rushYds = safe(s.rushYds || s.rushingYards);

  // ── Rushing Output (28%) ──
  const rushYdsPerGm = perGame(rushYds, gp);
  const rushTdPerGm = perGame(s.rushTd || s.rushingTds, gp);
  const rushFDPerGm = perGame(s.rushFD || s.rushingFirstDowns, gp);
  const rushing2ptPerGm = perGame(s.rushing2pt, gp);
  const rushingOutput = clamp(
    (clamp(rushYdsPerGm / 80) * 0.45) +
    (clamp(rushTdPerGm / 0.8) * 0.25) +
    (clamp(rushFDPerGm / 5) * 0.20) +
    (clamp(rushing2ptPerGm / 0.1) * 0.10)
  );

  // ── Receiving Value (22%) ──
  const recYdsPerGm = perGame(recYds, gp);
  const recPerGm = perGame(rec, gp);
  const recTdPerGm = perGame(s.recTd || s.receivingTds, gp);
  const recFDPerGm = perGame(s.recFD || s.receivingFirstDowns, gp);
  const receiving2ptPerGm = perGame(s.receiving2pt, gp);
  const receivingValue = clamp(
    (clamp(recYdsPerGm / 50) * 0.30) +
    (clamp(recPerGm / 5) * 0.25) +
    (clamp(recTdPerGm / 0.3) * 0.20) +
    (clamp(recFDPerGm / 3) * 0.15) +
    (clamp(receiving2ptPerGm / 0.1) * 0.10)
  );

  // ── Opportunity Share (18%) ──
  const carriesPerGm = perGame(carries, gp);
  const tgtShare = adjustShareForGP(safe(s.tgtShare || s.targetShare), gp);
  const airShare = adjustShareForGP(safe(s.airShare || s.airYardsShare), gp);
  const wopr = adjustShareForGP(safe(s.wopr), gp);
  const opportunityShare = clamp(
    (clamp(carriesPerGm / 20) * 0.35) +
    (clamp(tgtShare / 0.18) * 0.30) +
    (clamp(airShare / 0.10) * 0.20) +
    (clamp(wopr / 0.30) * 0.15)
  );

  // ── Rushing Efficiency (14%) ──
  const ydsPerCarry = carries > 0 ? rushYds / carries : 0;
  const rushFD = safe(s.rushFD || s.rushingFirstDowns);
  const rushFDPerCarry = carries > 0 ? rushFD / carries : 0;
  const rushEpaPerGm = perGame(s.rushEpa || s.rushingEpa, gp);
  const rushingEfficiency = clamp(
    (clamp(ydsPerCarry / 5.0) * 0.50) +
    (clamp(rushFDPerCarry / 0.25) * 0.30) +
    (clamp(Math.max(0, rushEpaPerGm) / 2.0) * 0.20)
  );

  // ── Receiving Efficiency (12%) ──
  const ydsPerTgt = tgt > 0 ? recYds / tgt : 0;
  const catchRate = tgt > 0 ? rec / tgt : 0;
  const yac = safe(s.yac || s.receivingYAC);
  const yacPerRec = rec > 0 ? yac / rec : 0;
  const receivingEfficiency = clamp(
    (clamp(ydsPerTgt / 8.0) * 0.35) +
    (clamp(catchRate / 0.80) * 0.30) +
    (clamp(yacPerRec / 6.0) * 0.35)
  );

  // ── Ball Security (6%) ──
  const fumLost = safe(s.fumLost || s.rushingFumblesLost) + safe(s.receivingFumblesLost);
  const ballSecurity = touches > 0 ? clamp(1 - (fumLost / touches) * 20) : 0.5;

  return (
    rushingOutput * 0.28 +
    receivingValue * 0.22 +
    opportunityShare * 0.18 +
    rushingEfficiency * 0.14 +
    receivingEfficiency * 0.12 +
    ballSecurity * 0.06
  );
}

// ─── WR Production Sub-Score ───────────────────────────────────────────────────
// 6 components using all individual WR stats.
// EPA kept at reduced weight — team quality is handled by the situation dimension.
//
// Receiving Output (25%)         — yards, TDs, first downs, 2pt
// Target Dominance (20%)         — target share, WOPR, air yards share
// Receiving Efficiency (20%)     — RACR, yds/tgt, catch rate, EPA (minor)
// Playmaking (15%)               — YAC/rec, air yards/gm (ADOT proxy), first downs/rec
// Volume (10%)                   — receptions/gm, targets/gm
// Versatility & Security (10%)   — rushing production, fumble rate

function calcWRProduction(s, gp) {
  if (!gp || gp === 0) return 0;

  const rec = safe(s.rec || s.receptions);
  const tgt = safe(s.tgt || s.targets);
  const recYds = safe(s.recYds || s.receivingYards);
  const recFD = safe(s.recFD || s.receivingFirstDowns);

  // ── Receiving Output (25%) ──
  const recYdsPerGm = perGame(recYds, gp);
  const recTdPerGm = perGame(s.recTd || s.receivingTds, gp);
  const recFDPerGm = perGame(recFD, gp);
  const receiving2ptPerGm = perGame(s.receiving2pt, gp);
  const receivingOutput = clamp(
    (clamp(recYdsPerGm / 90) * 0.40) +
    (clamp(recTdPerGm / 0.6) * 0.30) +
    (clamp(recFDPerGm / 5) * 0.20) +
    (clamp(receiving2ptPerGm / 0.1) * 0.10)
  );

  // ── Target Dominance (20%) ──
  const tgtShare = adjustShareForGP(safe(s.tgtShare || s.targetShare), gp);
  const wopr = adjustShareForGP(safe(s.wopr), gp);
  const airShare = adjustShareForGP(safe(s.airShare || s.airYardsShare), gp);
  const targetDominance = clamp(
    (clamp(tgtShare / 0.28) * 0.35) +
    (clamp(wopr / 0.70) * 0.35) +
    (clamp(airShare / 0.35) * 0.30)
  );

  // ── Receiving Efficiency (20%) ──
  // Individual talent metrics. EPA kept minor — it's partially team-dependent.
  const racr = safe(s.racr);
  const ydsPerTgt = tgt > 0 ? recYds / tgt : 0;
  const catchRate = tgt > 0 ? rec / tgt : 0;
  const recEpaPerGm = perGame(s.recEpa || s.receivingEpa, gp);
  const receivingEfficiency = clamp(
    (clamp(Math.min(racr, 1.5) / 1.2) * 0.30) +
    (clamp(ydsPerTgt / 12) * 0.25) +
    (clamp(catchRate / 0.72) * 0.25) +
    (clamp(Math.max(0, recEpaPerGm) / 4) * 0.20)
  );

  // ── Playmaking (15%) ──
  // Separates YAC skill, downfield usage, and chain-moving from raw production.
  const yac = safe(s.yac || s.receivingYAC);
  const yacPerRec = rec > 0 ? yac / rec : 0;
  const recAirYards = safe(s.receivingAirYards);
  const recAirYardsPerGm = perGame(recAirYards, gp);
  const recFDPerRec = rec > 0 ? recFD / rec : 0;
  const playmaking = clamp(
    (clamp(yacPerRec / 7) * 0.40) +
    (clamp(recAirYardsPerGm / 70) * 0.35) +
    (clamp(recFDPerRec / 0.35) * 0.25)
  );

  // ── Volume (10%) ──
  const recPerGm = perGame(rec, gp);
  const tgtPerGm = perGame(tgt, gp);
  const volume = clamp(
    (clamp(recPerGm / 7) * 0.50) +
    (clamp(tgtPerGm / 10) * 0.50)
  );

  // ── Versatility & Security (10%) ──
  // Gadget WRs (Deebo, Tyreek) who rush + ball security for all.
  const rushYdsPerGm = perGame(s.rushYds || s.rushingYards, gp);
  const rushTdPerGm = perGame(s.rushTd || s.rushingTds, gp);
  const touches = rec + safe(s.carries);
  const fumLost = safe(s.receivingFumblesLost) + safe(s.rushingFumblesLost) + safe(s.fumLost || 0);
  const fumRate = touches > 0 ? fumLost / touches : 0;
  const versatilitySecurity = clamp(
    (clamp(rushYdsPerGm / 15) * 0.40) +
    (clamp(rushTdPerGm / 0.15) * 0.20) +
    (clamp(1 - fumRate / 0.02) * 0.40)
  );

  return (
    receivingOutput * 0.25 +
    targetDominance * 0.20 +
    receivingEfficiency * 0.20 +
    playmaking * 0.15 +
    volume * 0.10 +
    versatilitySecurity * 0.10
  );
}

// ─── TE Production Sub-Score ───────────────────────────────────────────────────
// 6 components using all individual TE stats.
// TE-specific thresholds are lower than WR (70 yds/gm elite vs 90, etc.)
// because TE production is inherently lower — normalization against TE
// benchmarks ensures elite TEs score 0.9+ just like elite WRs.
//
// Receiving Output (28%)     — yards, TDs, first downs, 2pt
// Target Dominance (20%)     — target share, air yards share, WOPR
// Receiving Efficiency (18%) — RACR, yds/tgt, catch rate, EPA (minor)
// Playmaking (14%)           — YAC/rec, air yards/gm, first downs/rec
// Volume (14%)               — receptions/gm, targets/gm
// Ball Security (6%)         — fumble rate

function calcTEProduction(s, gp) {
  if (!gp || gp === 0) return 0;

  const rec = safe(s.rec || s.receptions);
  const tgt = safe(s.tgt || s.targets);
  const recYds = safe(s.recYds || s.receivingYards);
  const recFD = safe(s.recFD || s.receivingFirstDowns);

  // ── Receiving Output (28%) ──
  const recYdsPerGm = perGame(recYds, gp);
  const recTdPerGm = perGame(s.recTd || s.receivingTds, gp);
  const recFDPerGm = perGame(recFD, gp);
  const receiving2ptPerGm = perGame(s.receiving2pt, gp);
  const receivingOutput = clamp(
    (clamp(recYdsPerGm / 70) * 0.40) +
    (clamp(recTdPerGm / 0.5) * 0.30) +
    (clamp(recFDPerGm / 4) * 0.20) +
    (clamp(receiving2ptPerGm / 0.1) * 0.10)
  );

  // ── Target Dominance (20%) ──
  const tgtShare = adjustShareForGP(safe(s.tgtShare || s.targetShare), gp);
  const airShare = adjustShareForGP(safe(s.airShare || s.airYardsShare), gp);
  const wopr = adjustShareForGP(safe(s.wopr), gp);
  const targetDominance = clamp(
    (clamp(tgtShare / 0.22) * 0.45) +
    (clamp(airShare / 0.18) * 0.30) +
    (clamp(wopr / 0.40) * 0.25)
  );

  // ── Receiving Efficiency (18%) ──
  const racr = safe(s.racr);
  const ydsPerTgt = tgt > 0 ? recYds / tgt : 0;
  const catchRate = tgt > 0 ? rec / tgt : 0;
  const recEpaPerGm = perGame(s.recEpa || s.receivingEpa, gp);
  const receivingEfficiency = clamp(
    (clamp(Math.min(racr, 2.0) / 1.5) * 0.30) +
    (clamp(ydsPerTgt / 10) * 0.25) +
    (clamp(catchRate / 0.75) * 0.25) +
    (clamp(Math.max(0, recEpaPerGm) / 3) * 0.20)
  );

  // ── Playmaking (14%) ──
  const yac = safe(s.yac || s.receivingYAC);
  const yacPerRec = rec > 0 ? yac / rec : 0;
  const recAirYards = safe(s.receivingAirYards);
  const recAirYardsPerGm = perGame(recAirYards, gp);
  const recFDPerRec = rec > 0 ? recFD / rec : 0;
  const playmaking = clamp(
    (clamp(yacPerRec / 7) * 0.50) +
    (clamp(recAirYardsPerGm / 50) * 0.30) +
    (clamp(recFDPerRec / 0.40) * 0.20)
  );

  // ── Volume (14%) ──
  const recPerGm = perGame(rec, gp);
  const tgtPerGm = perGame(tgt, gp);
  const volume = clamp(
    (clamp(recPerGm / 6) * 0.50) +
    (clamp(tgtPerGm / 8) * 0.50)
  );

  // ── Ball Security (6%) ──
  const fumLost = safe(s.receivingFumblesLost) + safe(s.fumLost || 0);
  const fumRate = rec > 0 ? fumLost / rec : 0;
  const ballSecurity = clamp(1 - fumRate / 0.02);

  return (
    receivingOutput * 0.28 +
    targetDominance * 0.20 +
    receivingEfficiency * 0.18 +
    playmaking * 0.14 +
    volume * 0.14 +
    ballSecurity * 0.06
  );
}

// ─── K Production Sub-Score ────────────────────────────────────────────────────
// 4 components using all kicking stats including distance buckets from
// playerDetailedStats.js when available.
//
// FG Accuracy (30%)    — overall FG%, accuracy on 40+ yarders, missed/gm penalty
// FG Volume (25%)      — FG made/gm, FG attempts/gm (opportunity signal)
// Long Range (25%)     — 50+ yd makes/gm, longest FG, 40-49 yd makes/gm
// PAT Production (20%) — PAT made/gm, PAT accuracy

function calcKProduction(s, gp) {
  if (!gp || gp === 0) return 0;

  const fgm = safe(s.fgm || s.fgMade);
  const fga = safe(s.fga || s.fgAtt);
  const fgPct = safe(s.fgPct) || (fga > 0 ? fgm / fga : 0);
  const fgLong = safe(s.fgLong);
  const patm = safe(s.patm || s.patMade);
  const pata = safe(s.pata || s.patAtt);
  const patPct = safe(s.patPct) || (pata > 0 ? patm / pata : 0);

  // Distance bucket data (from playerDetailedStats.js; safe() returns 0 if absent)
  const fg50 = safe(s.fg50 || ((safe(s.fgMade50_59) || 0) + (safe(s.fgMade60) || 0)));
  const fg40_49 = safe(s.fgMade40_49);
  const fgMissed = safe(s.fgMissed);
  const fgMissed40Plus = safe(s.fgMissed40_49) + safe(s.fgMissed50_59) + safe(s.fgMissed60);
  const fgAtt40Plus = fg40_49 + fg50 + fgMissed40Plus;
  const fg40PlusPct = fgAtt40Plus > 0 ? (fg40_49 + fg50) / fgAtt40Plus : fgPct;

  // ── FG Accuracy (30%) ──
  const fgMissedPerGm = perGame(fgMissed, gp);
  const fgAccuracy = clamp(
    (clamp(fgPct / 0.90) * 0.40) +
    (clamp(fg40PlusPct / 0.80) * 0.30) +
    (clamp(1 - fgMissedPerGm / 0.30) * 0.30)
  );

  // ── FG Volume (25%) ──
  const fgmPerGm = perGame(fgm, gp);
  const fgaPerGm = perGame(fga, gp);
  const fgVolume = clamp(
    (clamp(fgmPerGm / 2.5) * 0.50) +
    (clamp(fgaPerGm / 2.8) * 0.50)
  );

  // ── Long Range (25%) ──
  const fg50PerGm = perGame(fg50, gp);
  const fg40_49PerGm = perGame(fg40_49, gp);
  const longRange = clamp(
    (clamp(fg50PerGm / 0.5) * 0.40) +
    (clamp((fgLong - 40) / 20) * 0.30) +
    (clamp(fg40_49PerGm / 1.0) * 0.30)
  );

  // ── PAT Production (20%) ──
  const patmPerGm = perGame(patm, gp);
  const patProduction = clamp(
    (clamp(patmPerGm / 3.5) * 0.60) +
    (clamp(patPct / 0.98) * 0.40)
  );

  return (
    fgAccuracy * 0.30 +
    fgVolume * 0.25 +
    longRange * 0.25 +
    patProduction * 0.20
  );
}

// ─── Position dispatcher ───────────────────────────────────────────────────────

function calcPositionProduction(stats, gp, pos) {
  switch (pos) {
    case 'QB':  return calcQBProduction(stats, gp);
    case 'RB':  return calcRBProduction(stats, gp);
    case 'WR':  return calcWRProduction(stats, gp);
    case 'TE':  return calcTEProduction(stats, gp);
    case 'K':   return calcKProduction(stats, gp);
    default:    return 0.5; // DEF — neutral
  }
}

// ─── Historical Production Blending ────────────────────────────────────────────
// Computes stat-based production for each available season, then applies
// year weights (65/20/10/5). Blends 60% historical + 40% current season.

const YEAR_WEIGHTS_4 = [0.50, 0.30, 0.15, 0.05];
const YEAR_WEIGHTS_3 = [0.55, 0.30, 0.15];
const YEAR_WEIGHTS_2 = [0.60, 0.40];

function getYearWeights(count) {
  if (count >= 4) return YEAR_WEIGHTS_4;
  if (count === 3) return YEAR_WEIGHTS_3;
  if (count === 2) return YEAR_WEIGHTS_2;
  return [1.0];
}

/**
 * Compute stat-based production score for a player.
 *
 * @param {Object} player - Player object from PLAYERS (with inline current-season stats)
 * @returns {number} 0-1 production score
 */
export function calcStatProduction(player) {
  const pos = player.pos;
  const historicalData = HISTORICAL_STATS?.players;
  const detailedData = PLAYER_DETAILED_STATS;

  // Current season sub-score from inline stats
  const currentGP = player.gp || 0;
  const currentScore = calcPositionProduction(player, currentGP, pos);

  // Historical sub-scores from per-season data
  const history = historicalData?.[player.id];
  if (!history) return currentScore; // no history = use current only

  const years = Object.keys(history).map(Number).sort((a, b) => b - a);
  if (years.length === 0) return currentScore;

  // For each historical season, compute the stat-based sub-score.
  // Skip injury/cup-of-coffee seasons (gp < 8) — too few games to be meaningful.
  const seasonScores = [];
  for (const yr of years) {
    const seasonHist = history[String(yr)];
    if (!seasonHist || !seasonHist.gp || seasonHist.gp < 8) continue;

    // Try detailed stats first (from playerDetailedStats.js), fall back to historicalStats.js
    const detailed = detailedData?.[player.id]?.[String(yr)];
    const stats = detailed || seasonHist;
    const gp = seasonHist.gp;

    // For kickers: if we have kicking stats, use them; otherwise fall back
    if (pos === 'K' && (stats.fgm || stats.fgMade || seasonHist.fgm)) {
      seasonScores.push(calcKProduction(stats.fgm ? stats : seasonHist, gp));
    } else if (pos !== 'K' && seasonHist.totalPts > 0) {
      // Normal position with stats
      seasonScores.push(calcPositionProduction(stats, gp, pos));
    } else if (pos === 'K') {
      // Kicker with kicking stats in historicalStats.js
      seasonScores.push(calcKProduction(seasonHist, gp));
    } else {
      // Fallback: normalize avgPts (the old method)
      const avgPts = seasonHist.avgPts || 0;
      const normalizers = { QB: 25, RB: 20, WR: 18, TE: 14, K: 10, DEF: 10 };
      seasonScores.push(clamp(avgPts / (normalizers[pos] || 15)));
    }

    if (seasonScores.length >= 4) break; // max 4 seasons
  }

  if (seasonScores.length === 0) return currentScore;

  // ─── Fluke dampener ───
  // Pedigree-modulated restoration: when the most recent qualifying season is
  // anomalously low relative to an established track record, restore it toward
  // the historical baseline. Pedigree (track record quality) determines HOW MUCH
  // to restore, and age attenuates the protection — prime-age players get full
  // benefit, post-cliff players get none. Skips monotonic decline (real regression).
  let flukeDetected = false;
  let flukeRestoreFraction = 0;
  if (seasonScores.length >= 3) {
    const recent = seasonScores[0];
    const declining = seasonScores[0] < seasonScores[1] && seasonScores[1] < seasonScores[2];
    if (!declining) {
      const priorValid = seasonScores.slice(1).filter(v => v > 0);
      if (priorValid.length >= 2) {
        const sorted = [...priorValid].sort((a, b) => a - b);
        const priorMedian = sorted[Math.floor(sorted.length / 2)];
        const dropPct = priorMedian > 0 ? Math.max(0, (priorMedian - recent) / priorMedian) : 0;

        if (dropPct > 0.15) {
          const pedigreeScore = calcPedigreeScore(player.id, pos);
          const ageProtection = calcAgeProtection(player.id, pos);
          // Volatility attenuation: volatile careers get less downside protection.
          // Use raw avgPts from ALL qualifying seasons (not the 4-season cap) so
          // career-long boom-bust patterns like Lamar's are captured accurately.
          const qualAvgs = years
            .map(yr => history[String(yr)])
            .filter(s => s && s.gp >= 8)
            .map(s => s.avgPts || 0)
            .filter(v => v > 0);
          let volatilityAttenuator = 1.0;
          if (qualAvgs.length >= 3) {
            const cvMean = qualAvgs.reduce((a, b) => a + b, 0) / qualAvgs.length;
            const cvVar = qualAvgs.reduce((a, b) => a + (b - cvMean) ** 2, 0) / qualAvgs.length;
            const cv = cvMean > 0 ? Math.sqrt(cvVar) / cvMean : 0;
            volatilityAttenuator = cv <= 0.08 ? 1.0
              : cv >= 0.28 ? 0.15
              : 1.0 - (cv - 0.08) / (0.28 - 0.08) * 0.85;
          }
          flukeRestoreFraction = pedigreeScore * ageProtection * volatilityAttenuator;
          if (flukeRestoreFraction > 0.05) {
            flukeDetected = true;
            seasonScores[0] = recent + (priorMedian - recent) * flukeRestoreFraction;
            seasonScores[0] = Math.min(seasonScores[0], priorMedian);
          }
        }
      }
    }
  }

  // ─── Spike dampener ───
  // Symmetric upside counterpart: when the most recent season spikes well above
  // the prior median, dampen it. Uses inverse pedigree (unproven = more dampening)
  // and depth penalty (fewer prior seasons = more skepticism).
  // Skips monotonically ascending careers (real development, not a fluke).
  let spikeDetected = false;
  if (seasonScores.length >= 2) {
    const recent = seasonScores[0];
    const priorValid = seasonScores.slice(1).filter(v => v > 0);
    if (priorValid.length >= 1) {
      const sorted = [...priorValid].sort((a, b) => a - b);
      const priorMedian = sorted[Math.floor(sorted.length / 2)];
      const spikePct = priorMedian > 0 ? Math.max(0, (recent - priorMedian) / priorMedian) : 0;

      if (spikePct > 0.20) {
        // Skip if monotonically ascending across 3+ seasons (real development)
        const ascending = seasonScores.length >= 3 &&
          seasonScores[0] > seasonScores[1] && seasonScores[1] > seasonScores[2];
        if (!ascending) {
          const spikePosPedigree = calcPedigreeScore(player.id, pos);
          const inversePedigree = 1.0 - spikePosPedigree;
          const depthPenalty = priorValid.length === 1 ? 0.35
            : priorValid.length === 2 ? 0.15 : 0;
          const spikeSkepticism = Math.min(1.0, inversePedigree + depthPenalty);
          const spikeDampen = Math.min(0.60, spikeSkepticism * 0.60);
          seasonScores[0] = recent - (recent - priorMedian) * spikeDampen;
          seasonScores[0] = Math.max(seasonScores[0], priorMedian); // never pull below median
          if (spikeDampen > 0.05) spikeDetected = true;
        }
      }
    }
  }

  // Apply year weights
  const weights = getYearWeights(seasonScores.length);
  let weightedHistorical = 0;
  for (let i = 0; i < seasonScores.length; i++) {
    weightedHistorical += seasonScores[i] * weights[i];
  }

  // ─── Ascension throttle ───
  // For thin track records, regress toward neutral baseline to prevent one
  // breakout season from over-inflating the historical score.
  if (seasonScores.length <= 2) {
    const regressionRate = seasonScores.length === 1 ? 0.30 : 0.15;
    weightedHistorical = weightedHistorical * (1 - regressionRate) + 0.45 * regressionRate;
  }

  // Blend historical with current season.
  // When a fluke is detected, shift weight toward history — the current season's
  // inline stats carry the same bad data, and double-counting it craters proven players.
  let histWeight = 0.60;
  let currWeight = 0.40;
  if (flukeDetected && seasonScores.length >= 3) {
    const priorValid = seasonScores.slice(1).filter(v => v > 0);
    if (priorValid.length >= 2) {
      const sorted = [...priorValid].sort((a, b) => a - b);
      const priorMedian = sorted[Math.floor(sorted.length / 2)];
      const currentDrop = priorMedian > 0 ? Math.max(0, (priorMedian - currentScore) / priorMedian) : 0;
      if (currentDrop > 0.15) {
        const flukeShift = Math.min(0.15, currentDrop * flukeRestoreFraction * 0.30);
        histWeight += flukeShift;
        currWeight -= flukeShift;
      }
    }
  }

  // ─── Spike blend adjustment ───
  // When a spike is detected on a thin track record, shift blend toward history
  // (now dampened/regressed) to prevent current-season weight from re-inflating.
  if (spikeDetected && seasonScores.length <= 2) {
    histWeight += 0.10;
    currWeight -= 0.10;
  }

  return (weightedHistorical * histWeight) + (currentScore * currWeight);
}

/**
 * Get detailed sub-score breakdown for UI transparency.
 * Returns an object with each sub-component's contribution.
 */
export function getPositionSubScores(player) {
  const pos = player.pos;
  const gp = player.gp || 0;
  if (!gp) return { total: 0, components: {} };

  const total = calcPositionProduction(player, gp, pos);

  // Build component breakdown for the current season
  const components = {};
  switch (pos) {
    case 'QB': {
      const att = safe(player.att);
      const sacks = safe(player.sacks);
      const dropbacks = att + sacks;
      const cmpPct = att > 0 ? player.cmp / att : 0;
      const sackRate = dropbacks > 0 ? sacks / dropbacks : 0;
      const intRate = att > 0 ? safe(player.int) / att : 0;
      components.passingOutput = { weight: 0.30, passYdsPerGm: +perGame(player.passYds, gp).toFixed(1), passTdPerGm: +perGame(player.passTd, gp).toFixed(2) };
      components.passingEfficiency = { weight: 0.25, cpoe: safe(player.cpoe), cmpPct: +(cmpPct * 100).toFixed(1), ydsPerAtt: att > 0 ? +(safe(player.passYds) / att).toFixed(1) : 0 };
      components.rushingContribution = { weight: 0.20, rushYdsPerGm: +perGame(player.rushYds, gp).toFixed(1), rushTdPerGm: +perGame(player.rushTd, gp).toFixed(2) };
      components.pocketPresence = { weight: 0.15, sackRate: +(sackRate * 100).toFixed(1) };
      components.ballSecurity = { weight: 0.10, intRate: +(intRate * 100).toFixed(2) };
      break;
    }
    case 'RB': {
      const carries = safe(player.carries);
      const rec = safe(player.rec);
      const tgt = safe(player.tgt);
      components.rushingOutput = { weight: 0.28, rushYdsPerGm: +perGame(player.rushYds, gp).toFixed(1), rushTdPerGm: +perGame(player.rushTd, gp).toFixed(2) };
      components.receivingValue = { weight: 0.22, recYdsPerGm: +perGame(player.recYds, gp).toFixed(1), recPerGm: +perGame(rec, gp).toFixed(1) };
      components.opportunityShare = { weight: 0.18, carriesPerGm: +perGame(carries, gp).toFixed(1), tgtShare: player.tgtShare };
      components.rushingEfficiency = { weight: 0.14, ydsPerCarry: carries > 0 ? +(safe(player.rushYds) / carries).toFixed(1) : 0 };
      components.receivingEfficiency = { weight: 0.12, ydsPerTgt: tgt > 0 ? +(safe(player.recYds) / tgt).toFixed(1) : 0, catchRate: tgt > 0 ? +((rec / tgt) * 100).toFixed(1) : 0 };
      components.ballSecurity = { weight: 0.06, fumLost: safe(player.fumLost) };
      break;
    }
    case 'WR': {
      const rec = safe(player.rec);
      const tgt = safe(player.tgt);
      components.receivingOutput = { weight: 0.25, recYdsPerGm: +perGame(player.recYds, gp).toFixed(1), recTdPerGm: +perGame(player.recTd, gp).toFixed(2) };
      components.targetDominance = { weight: 0.20, tgtShare: player.tgtShare, wopr: player.wopr, airShare: player.airShare };
      components.receivingEfficiency = { weight: 0.20, racr: player.racr, ydsPerTgt: tgt > 0 ? +(safe(player.recYds) / tgt).toFixed(1) : 0, catchRate: tgt > 0 ? +((rec / tgt) * 100).toFixed(1) : 0 };
      components.playmaking = { weight: 0.15, yacPerRec: rec > 0 ? +(safe(player.yac) / rec).toFixed(1) : 0 };
      components.volume = { weight: 0.10, recPerGm: +perGame(rec, gp).toFixed(1), tgtPerGm: +perGame(tgt, gp).toFixed(1) };
      components.versatilitySecurity = { weight: 0.10, rushYdsPerGm: +perGame(player.rushYds, gp).toFixed(1) };
      break;
    }
    case 'TE': {
      const rec = safe(player.rec);
      const tgt = safe(player.tgt);
      components.receivingOutput = { weight: 0.28, recYdsPerGm: +perGame(player.recYds, gp).toFixed(1), recTdPerGm: +perGame(player.recTd, gp).toFixed(2) };
      components.targetDominance = { weight: 0.20, tgtShare: player.tgtShare, airShare: player.airShare };
      components.receivingEfficiency = { weight: 0.18, racr: player.racr, ydsPerTgt: tgt > 0 ? +(safe(player.recYds) / tgt).toFixed(1) : 0, catchRate: tgt > 0 ? +((rec / tgt) * 100).toFixed(1) : 0 };
      components.playmaking = { weight: 0.14, yacPerRec: rec > 0 ? +(safe(player.yac) / rec).toFixed(1) : 0 };
      components.volume = { weight: 0.14, recPerGm: +perGame(rec, gp).toFixed(1), tgtPerGm: +perGame(tgt, gp).toFixed(1) };
      components.ballSecurity = { weight: 0.06 };
      break;
    }
    case 'K': {
      const fgm = safe(player.fgm);
      const fga = safe(player.fga);
      components.fgAccuracy = { weight: 0.30, fgPct: player.fgPct };
      components.fgVolume = { weight: 0.25, fgmPerGm: +perGame(fgm, gp).toFixed(2), fgaPerGm: +perGame(fga, gp).toFixed(2) };
      components.longRange = { weight: 0.25, fgLong: player.fgLong, fg50: player.fg50 };
      components.patProduction = { weight: 0.20, patmPerGm: +perGame(player.patm, gp).toFixed(2), patPct: player.patPct };
      break;
    }
  }

  return { total, components };
}
