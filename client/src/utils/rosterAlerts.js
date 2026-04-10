import { getByeWeek } from '../data/nflSchedule';
import { GAMES_PLAYED } from './playoffCalc';

const CURRENT_WEEK = GAMES_PLAYED + 1; // 12

const STARTER_COUNTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };
const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE']);

/**
 * Split a roster into starters and bench using a greedy projection-based approach.
 * Returns { starters: [{ player, slotLabel }], bench: [{ player }] }
 */
function assignStarters(players) {
  const sorted = [...players].sort((a, b) => (b.proj || 0) - (a.proj || 0));
  const used = new Set();
  const starters = [];
  const slotsFilled = {};

  // Fill required positional slots
  for (const p of sorted) {
    const limit = STARTER_COUNTS[p.pos] || 0;
    if (limit > 0 && (slotsFilled[p.pos] || 0) < limit) {
      slotsFilled[p.pos] = (slotsFilled[p.pos] || 0) + 1;
      starters.push({ player: p, slotLabel: p.pos });
      used.add(p.id);
    }
  }

  // Fill FLEX slot with best remaining RB/WR/TE
  for (const p of sorted) {
    if (used.has(p.id)) continue;
    if (FLEX_POSITIONS.has(p.pos)) {
      starters.push({ player: p, slotLabel: 'FLEX' });
      used.add(p.id);
      break;
    }
  }

  const bench = sorted.filter(p => !used.has(p.id)).map(p => ({ player: p }));
  return { starters, bench };
}

export function getByeAlerts(starters, currentWeek = CURRENT_WEEK) {
  const alerts = [];
  for (const { player, slotLabel } of starters) {
    if (!player) continue;
    const bye = getByeWeek(player.team);
    if (bye === currentWeek) {
      alerts.push({ type: 'bye', severity: 'red', player, slotLabel });
    }
  }
  return alerts;
}

export function getInjuryAlerts(starters) {
  const alerts = [];
  for (const { player, slotLabel } of starters) {
    if (!player) continue;
    if (player.status === 'out') {
      alerts.push({ type: 'injury', severity: 'red', player, slotLabel });
    }
  }
  return alerts;
}

export function getStartSitAlerts(starters, bench) {
  const alerts = [];
  for (const { player: benchPlayer } of bench) {
    if (!benchPlayer) continue;
    // Find the worst starter at the same position (or FLEX-eligible)
    const matchingStarters = starters.filter(s =>
      s.player && (s.player.pos === benchPlayer.pos || (s.slotLabel === 'FLEX' && FLEX_POSITIONS.has(benchPlayer.pos)))
    );
    for (const { player: starter, slotLabel } of matchingStarters) {
      const delta = (benchPlayer.proj || 0) - (starter.proj || 0);
      if (delta >= 2) {
        alerts.push({ type: 'start-sit', severity: 'amber', bench: benchPlayer, starter, delta: delta.toFixed(1), slotLabel });
        break; // one alert per bench player
      }
    }
  }
  return alerts;
}

export function getEmptySlotAlerts(starters) {
  const alerts = [];
  const totalExpected = Object.values(STARTER_COUNTS).reduce((a, b) => a + b, 0) + 1; // +1 FLEX
  if (starters.length < totalExpected) {
    const filledSlots = {};
    starters.forEach(s => { filledSlots[s.slotLabel] = (filledSlots[s.slotLabel] || 0) + 1; });
    for (const [pos, count] of Object.entries(STARTER_COUNTS)) {
      const filled = filledSlots[pos] || 0;
      for (let i = filled; i < count; i++) {
        alerts.push({ type: 'empty', severity: 'red', slotLabel: pos });
      }
    }
    if (!filledSlots['FLEX']) {
      alerts.push({ type: 'empty', severity: 'red', slotLabel: 'FLEX' });
    }
  }
  return alerts;
}

export function getTradeAlerts(trades, userTeamId) {
  if (!trades || trades.length === 0) return [];
  const pending = trades.filter(t =>
    t.status === 'pending' && (t.from === userTeamId || t.to === userTeamId)
  );
  if (pending.length === 0) return [];
  return [{ type: 'trade', severity: 'amber', count: pending.length }];
}

export function getAllAlerts(rosters, playerMap, currentWeek, trades, userTeamId) {
  if (!rosters || !rosters[userTeamId]) return [];

  const rosterPlayerIds = rosters[userTeamId];
  const players = rosterPlayerIds.map(pid => playerMap[pid]).filter(Boolean);
  const { starters, bench } = assignStarters(players);

  const alerts = [
    ...getEmptySlotAlerts(starters),
    ...getByeAlerts(starters, currentWeek),
    ...getInjuryAlerts(starters),
    ...getStartSitAlerts(starters, bench),
    ...getTradeAlerts(trades, userTeamId),
  ];

  // Sort: red first, then amber
  alerts.sort((a, b) => {
    if (a.severity === 'red' && b.severity !== 'red') return -1;
    if (a.severity !== 'red' && b.severity === 'red') return 1;
    return 0;
  });

  return alerts;
}
