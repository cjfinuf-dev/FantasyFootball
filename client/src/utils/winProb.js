import { gameState } from '../data/gameState';

// Average per-player score variance (points). Used to estimate standard
// deviation of remaining team score based on remaining player count.
const AVG_PLAYER_VARIANCE = 6;
const POSITION_VARIANCE_MULT = {
  QB: 1.4, RB: 1.1, WR: 1.15, TE: 1.0, K: 0.5, DEF: 0.6,
};

/**
 * Error function approximation (Abramowitz & Stegun, formula 7.1.26).
 * Maximum error: 1.5×10⁻⁷.
 */
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const a = Math.abs(x);

  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const t = 1.0 / (1.0 + p * a);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-a * a);
  return sign * y;
}

/**
 * Standard normal CDF: P(X ≤ x) for X ~ N(0,1).
 */
function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Core win probability formula.
 * Uses uncertainty-weighted normal CDF when remaining players exist,
 * estimating stdDev from remaining player count per team.
 *
 * Pre-game:  uses projected spread vs estimated variance
 * Mid-game:  weights lead/deficit by remaining uncertainty
 * Game over: hard 0 / 0.5 / 1
 */
export function calcWinProb(myActual, myRemaining, oppActual, oppRemaining, myRemainingPlayers = 0, oppRemainingPlayers = 0, varianceSum = 0) {
  const totalRemaining = myRemaining + oppRemaining;

  // Game over — all players finished. Only now can we snap to hard 0 / 0.5 / 1.
  if (totalRemaining === 0) {
    const diff = myActual - oppActual;
    return diff > 0 ? 1 : diff < 0 ? 0 : 0.5;
  }

  const spread = (myActual + myRemaining) - (oppActual + oppRemaining);

  // Uncertainty-weighted path: estimate standard deviation from remaining
  // player counts using a simple model. When position-weighted varianceSum
  // is provided, use it for more accurate per-position uncertainty.
  const totalRemainingPlayers = myRemainingPlayers + oppRemainingPlayers;
  const stdDev = varianceSum > 0
    ? Math.sqrt(varianceSum)
    : totalRemainingPlayers > 0
      ? Math.sqrt(totalRemainingPlayers) * AVG_PLAYER_VARIANCE
      : 0;

  let raw;
  if (stdDev > 0) {
    raw = normalCDF(spread / stdDev);
  } else {
    // Fallback: linear formula when stdDev is 0 (no remaining player count data)
    raw = 0.5 + (spread / totalRemaining) * 0.5;
  }

  // While any players remain, cap at 99.99% / 0.01% — never show 100%/0%
  // until the outcome is literally final.
  return Math.max(0.0001, Math.min(0.9999, raw));
}

/**
 * Split a team's starter list into actual (locked-in) and remaining (projected) points.
 * Uses gameState for live data; falls back to pure projections when gameState is empty.
 */
export function getTeamScoreSplit(starterIds, playerMap) {
  let actual = 0;
  let remaining = 0;
  let remainingPlayers = 0;
  let varianceSum = 0;

  for (const pid of starterIds) {
    const player = playerMap[pid];
    if (!player) continue;

    const gs = gameState[pid];

    if (!gs || gs.status === 'scheduled') {
      remaining += player.proj;
      remainingPlayers++;
      const posMult = POSITION_VARIANCE_MULT[player.pos] || 1.0;
      varianceSum += (AVG_PLAYER_VARIANCE * posMult) ** 2;
    } else if (gs.status === 'playing') {
      actual += gs.actual;
      remaining += Math.max(0, player.proj - gs.actual);
      remainingPlayers++;
      const posMult = POSITION_VARIANCE_MULT[player.pos] || 1.0;
      varianceSum += (AVG_PLAYER_VARIANCE * posMult) ** 2;
    } else if (gs.status === 'final') {
      actual += gs.actual;
    }
    // 'bye' contributes nothing
  }

  return { actual, remaining, remainingPlayers, varianceSum };
}

/**
 * Pick starters from a roster, enforcing positional slot limits so that
 * optimal lineup selection doesn't stack an illegal number of QBs, etc.
 *
 * Slot limits: QB×1, RB×2, WR×2, TE×1, K×1, DEF×1 (+ 1 FLEX from RB/WR/TE).
 * Players are greedily selected in projection order within each slot.
 *
 * Note: calcWinProb uses an uncertainty-weighted normal CDF model based on
 * remaining player counts. The linear formula is retained as a fallback when
 * remaining player count data is unavailable.
 */
const STARTER_COUNTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };

export function getStarterIds(rosterIds, playerMap, rosterConfig = null) {
  const slotLimits = rosterConfig
    ? Object.fromEntries(Object.entries(rosterConfig).map(([pos, n]) => [pos, n]))
    : STARTER_COUNTS;

  const available = rosterIds.filter(pid => playerMap[pid]);
  const sorted = [...available].sort((a, b) => (playerMap[b].proj || 0) - (playerMap[a].proj || 0));

  const used = new Set();
  const starters = [];
  const slotsFilled = {};

  // Fill required positional slots first (greedy, best proj first)
  for (const pid of sorted) {
    const pos = playerMap[pid].pos;
    const limit = slotLimits[pos] || 0;
    if (limit > 0 && (slotsFilled[pos] || 0) < limit) {
      slotsFilled[pos] = (slotsFilled[pos] || 0) + 1;
      starters.push(pid);
      used.add(pid);
    }
  }

  // Fill FLEX slot with best remaining RB/WR/TE
  for (const pid of sorted) {
    if (used.has(pid)) continue;
    const pos = playerMap[pid].pos;
    if (pos === 'RB' || pos === 'WR' || pos === 'TE') {
      starters.push(pid);
      used.add(pid);
      break;
    }
  }

  return starters;
}

/**
 * Convenience: compute win probability for a full matchup.
 */
export function getMatchupWinProb(homeRosterIds, awayRosterIds, playerMap) {
  const homeStarters = getStarterIds(homeRosterIds, playerMap);
  const awayStarters = getStarterIds(awayRosterIds, playerMap);
  const home = getTeamScoreSplit(homeStarters, playerMap);
  const away = getTeamScoreSplit(awayStarters, playerMap);
  const combinedVariance = home.varianceSum + away.varianceSum;
  return calcWinProb(home.actual, home.remaining, away.actual, away.remaining, home.remainingPlayers, away.remainingPlayers, combinedVariance);
}
