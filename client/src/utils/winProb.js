import { gameState } from '../data/gameState';

/**
 * Core win probability formula.
 * Normalizes the expected spread by remaining projected points so that
 * a lead becomes more significant as fewer points remain to be scored.
 *
 * Pre-game:  equivalent to myProj / (myProj + oppProj)
 * Mid-game:  weights lead/deficit by remaining uncertainty
 * Game over: hard 0 / 0.5 / 1
 */
export function calcWinProb(myActual, myRemaining, oppActual, oppRemaining) {
  const totalRemaining = myRemaining + oppRemaining;

  // Game over — all players finished. Only now can we snap to hard 0 / 0.5 / 1.
  if (totalRemaining === 0) {
    const diff = myActual - oppActual;
    return diff > 0 ? 1 : diff < 0 ? 0 : 0.5;
  }

  const spread = (myActual + myRemaining) - (oppActual + oppRemaining);
  const raw = 0.5 + (spread / totalRemaining) * 0.5;

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

  for (const pid of starterIds) {
    const player = playerMap[pid];
    if (!player) continue;

    const gs = gameState[pid];

    if (!gs || gs.status === 'scheduled') {
      remaining += player.proj;
    } else if (gs.status === 'playing') {
      actual += gs.actual;
      remaining += Math.max(0, player.proj - gs.actual);
    } else if (gs.status === 'final') {
      actual += gs.actual;
    }
    // 'bye' contributes nothing
  }

  return { actual, remaining };
}

/**
 * Pick starters from a roster, enforcing positional slot limits so that
 * optimal lineup selection doesn't stack an illegal number of QBs, etc.
 *
 * Slot limits: QB×1, RB×2, WR×2, TE×1, K×1, DEF×1 (+ 1 FLEX from RB/WR/TE).
 * Players are greedily selected in projection order within each slot.
 *
 * Note: calcWinProb uses a linear approximation (spread / remaining) rather
 * than a proper uncertainty-weighted distribution. It is accurate enough for
 * pre-game use but will underestimate variance in mid-game scenarios where
 * one team has many players yet to play. A proper model would use a
 * Monte Carlo or log5-style formula with per-position score distributions.
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
  return calcWinProb(home.actual, home.remaining, away.actual, away.remaining);
}
