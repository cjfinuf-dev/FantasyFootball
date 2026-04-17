import { gameState } from '../data/gameState';
import { getTeamScoreSplit } from './winProb';
import { calcFantasyPoints } from './fantasyCalc';
import { SCORING_PRESETS } from '../data/scoring';

// Compute a live team total for a set of starters.
// Wraps getTeamScoreSplit (do not duplicate its actual/remaining logic) and
// returns { actual, projected, remaining, playing, final, scheduled }.
//
// starters  — array of player ids already filtered to starting slots
// playerMap — { [pid]: player }
// opts.scoringPreset — reserved for Tier 2 (#11); today it's passed through
//   when we compute per-player fallback points from raw stats. Not currently
//   used because the context pre-computes `actual` at ingest time.
export function computeLiveTeamScore(starters, playerMap, opts = {}) {
  const split = getTeamScoreSplit(starters || [], playerMap || {});

  let playing = 0;
  let finalCount = 0;
  let scheduled = 0;
  for (const pid of starters || []) {
    const gs = gameState[pid];
    if (!gs || gs.status === 'scheduled') scheduled += 1;
    else if (gs.status === 'playing') playing += 1;
    else if (gs.status === 'final') finalCount += 1;
    // 'bye' is ignored in counts — it's a nothing-contribution.
  }

  return {
    actual: split.actual,
    remaining: split.remaining,
    projected: split.actual + split.remaining,
    playing,
    final: finalCount,
    scheduled,
    // Returned so callers can plug straight into calcWinProb if needed.
    remainingPlayers: split.remainingPlayers,
    varianceSum: split.varianceSum,
  };
}

// Overlay live actuals onto an existing lineup structure without recomputing
// slot assignment. Used by MyLineup to keep slot layout stable but surface
// live actuals and status next to each player.
//
// lineup expected shape: { starters: [{ player, ... }], bench: [...], ir: [...] }
export function mergeLiveIntoLineup(lineup) {
  if (!lineup) return lineup;
  const enrich = (entry) => {
    if (!entry?.player) return entry;
    const gs = gameState[entry.player.id];
    if (!gs) return { ...entry, live: null };
    return { ...entry, live: { status: gs.status, actual: gs.actual } };
  };
  return {
    starters: (lineup.starters || []).map(enrich),
    bench: (lineup.bench || []).map(enrich),
    ir: (lineup.ir || []).map(enrich),
  };
}

// True if the player is currently live-scoring (status === 'playing'). Used to
// show a pulsing dot on live contributors. Accepts either name or pid to match
// different call-sites (name → gameState lookup via players map, pid → direct).
export function isPlayerActive(pidOrName, liveContext = null) {
  if (!pidOrName) return false;
  const gs = gameState[pidOrName];
  if (gs) return gs.status === 'playing';
  // Fallback: caller passed a name and we have a context with `players`.
  if (liveContext?.players?.[pidOrName]) {
    return liveContext.players[pidOrName].status === 'playing';
  }
  return false;
}

// Tier-2 hook point: compute per-player fantasy points from raw stats using
// any scoring preset. Today the context pre-applies halfPpr at ingest; once
// per-league preset threading lands, components can swap via this helper.
export function recomputePlayerPoints(rawStats, playerPos, presetId = 'halfPpr') {
  const preset = SCORING_PRESETS[presetId] || SCORING_PRESETS.halfPpr;
  return calcFantasyPoints(rawStats, preset, playerPos);
}
