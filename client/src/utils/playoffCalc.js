import { TEAMS } from '../data/teams';
import { MATCHUPS } from '../data/matchups';
import {
  DATA_SEASON, TOTAL_WEEKS, PLAYOFF_SPOTS, BYE_SEEDS,
  GAMES_PLAYED, REMAINING_WEEKS, SIMULATIONS, checkSeasonGuard,
} from '../data/seasonConfig';

// Re-export so existing consumers don't break
export { DATA_SEASON, TOTAL_WEEKS, PLAYOFF_SPOTS, BYE_SEEDS, GAMES_PLAYED, REMAINING_WEEKS, SIMULATIONS, checkSeasonGuard };

// Current-week matchups (treated as "this week"). Hardcoded fallback schedule
// for weeks 13 and 14 follows. If REMAINING_WEEKS extends past the hardcoded
// window, the simulator will only see weeks that exist here — flag in dev so
// the staleness is visible instead of silently producing wrong odds.
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  const hardcodedWeeks = new Set([GAMES_PLAYED + 1, 13, 14]);
  for (let w = GAMES_PLAYED + 1; w <= TOTAL_WEEKS; w++) {
    if (!hardcodedWeeks.has(w)) {
      console.warn(`[playoffCalc] Week ${w} has no schedule entries — simulation will skip it and produce stale odds.`);
    }
  }
}

export const schedule = [
  ...MATCHUPS.map(m => ({ home: m.home.teamId, away: m.away.teamId, week: GAMES_PLAYED + 1 })),
  { home: 't1', away: 't4', week: 13 }, { home: 't2', away: 't3', week: 13 },
  { home: 't5', away: 't8', week: 13 }, { home: 't6', away: 't7', week: 13 },
  { home: 't9', away: 't12', week: 13 }, { home: 't10', away: 't11', week: 13 },
  { home: 't1', away: 't6', week: 14 }, { home: 't2', away: 't5', week: 14 },
  { home: 't3', away: 't8', week: 14 }, { home: 't4', away: 't7', week: 14 },
  { home: 't9', away: 't10', week: 14 }, { home: 't11', away: 't12', week: 14 },
];

export function simGame(a, b) {
  const p = a.power / (a.power + b.power);
  return Math.random() < p ? a.id : b.id;
}

export function runSimulations(teams, overrides = {}, simCount = SIMULATIONS) {
  const guard = checkSeasonGuard();
  if (guard.stale) {
    console.warn(`[playoffCalc] DATA_SEASON (${guard.dataSeason}) does not match current year (${guard.currentYear}). Update constants or switch to API-driven season data.`);
  }

  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  const counts = {}, seedCounts = {}, champCounts = {}, byeCounts = {};
  teams.forEach(t => {
    counts[t.id] = 0;
    seedCounts[t.id] = Array(teams.length).fill(0);
    champCounts[t.id] = 0;
    byeCounts[t.id] = 0;
  });

  for (let sim = 0; sim < simCount; sim++) {
    const records = {}, pf = {};
    teams.forEach(t => {
      records[t.id] = { wins: t.wins, losses: t.losses };
      pf[t.id] = t.pf;
    });

    for (const game of schedule) {
      const key = `${game.home}-${game.away}-w${game.week}`;
      if (overrides[key] !== undefined) {
        // Apply the mean of the simulated PF distribution to overridden games
        // so seed tiebreakers (wins → PF) don't penalize teams the user forced
        // to a result. Winner averages 130 pts, loser 105 — midpoints of the
        // [100,160] / [80,130] random ranges below.
        if (overrides[key] === game.home) {
          records[game.home].wins++; records[game.away].losses++;
          pf[game.home] += 130; pf[game.away] += 105;
        } else {
          records[game.away].wins++; records[game.home].losses++;
          pf[game.away] += 130; pf[game.home] += 105;
        }
        continue;
      }
      const homeWinP = teamMap[game.home].power / (teamMap[game.home].power + teamMap[game.away].power);
      if (Math.random() < homeWinP) {
        records[game.home].wins++; records[game.away].losses++;
        pf[game.home] += 100 + Math.random() * 60; pf[game.away] += 80 + Math.random() * 50;
      } else {
        records[game.away].wins++; records[game.home].losses++;
        pf[game.away] += 100 + Math.random() * 60; pf[game.home] += 80 + Math.random() * 50;
      }
    }

    const ranked = [...teams].sort((a, b) => {
      const wDiff = records[b.id].wins - records[a.id].wins;
      return wDiff !== 0 ? wDiff : pf[b.id] - pf[a.id];
    });

    ranked.forEach((t, i) => {
      seedCounts[t.id][i]++;
      if (i < PLAYOFF_SPOTS) counts[t.id]++;
      if (i < BYE_SEEDS) byeCounts[t.id]++;
    });

    // Playoff bracket, driven by seasonConfig: top `BYE_SEEDS` seeds get a
    // first-round bye. Remaining seeds play Wild Card games, pairing outermost
    // to innermost (e.g. with BYE_SEEDS=2, PLAYOFF_SPOTS=6 → seeds 3v6, 4v5).
    //
    // NOTE: semis/championship still assume the 2-bye / 2-WC-game / 4-team
    // semifinal shape. Changing BYE_SEEDS or the WC size would require
    // reshaping the later rounds too.
    const p = ranked.slice(0, PLAYOFF_SPOTS).map(t => teamMap[t.id]);
    const wcStart = BYE_SEEDS;          // first non-bye seed index (0-indexed)
    const wcEnd = PLAYOFF_SPOTS - 1;    // last playoff seed index
    const wc1 = simGame(p[wcStart], p[wcEnd]);
    const wc2 = simGame(p[wcStart + 1], p[wcEnd - 1]);
    const wcW1 = teamMap[wc1], wcW2 = teamMap[wc2];
    // Seed-index-based pairing: look up each winner's original seed position.
    // The worse-seeded (higher index) winner faces the 1-seed.
    const seedIndex = {};
    p.forEach((t, i) => { seedIndex[t.id] = i; });
    const wc1Seed = seedIndex[wc1] ?? PLAYOFF_SPOTS;
    const wc2Seed = seedIndex[wc2] ?? PLAYOFF_SPOTS;
    const worseSeedWinner = wc1Seed > wc2Seed ? wcW1 : wcW2;
    const betterSeedWinner = worseSeedWinner === wcW1 ? wcW2 : wcW1;
    const sf1 = simGame(p[0], worseSeedWinner);   // 1 vs worse seed
    const sf2 = simGame(p[1], betterSeedWinner);  // 2 vs better seed
    const champ = simGame(teamMap[sf1], teamMap[sf2]);
    champCounts[champ]++;
  }

  return teams.map(t => ({
    ...t,
    playoffPct: (counts[t.id] / simCount) * 100,
    seedDist: seedCounts[t.id].map(c => (c / simCount) * 100),
    champPct: (champCounts[t.id] / simCount) * 100,
    byePct: (byeCounts[t.id] / simCount) * 100,
  }));
}

export function getMagicNumber(team) {
  const sorted = [...TEAMS].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
  const bubble = sorted[PLAYOFF_SPOTS];
  if (!bubble) return null;
  const magic = bubble.wins + REMAINING_WEEKS - team.wins + 1;
  return magic <= 0 ? 0 : magic;
}

export function getEliminated(team) {
  const sorted = [...TEAMS].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
  const lastIn = sorted[PLAYOFF_SPOTS - 1];
  return team.wins + REMAINING_WEEKS < lastIn.wins;
}

export function getStatus(team) {
  const magic = getMagicNumber(team);
  if (magic === 0) return { label: 'CLINCHED', cls: 'clinched' };
  if (getEliminated(team)) return { label: 'ELIMINATED', cls: 'eliminated' };
  if (magic <= 1) return { label: `MAGIC: ${magic}`, cls: 'magic' };
  return null;
}
