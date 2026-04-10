import { TEAMS } from '../data/teams';
import { MATCHUPS } from '../data/matchups';

// SEASON: 2024-25 — Update these constants each season before playoffs
export const TOTAL_WEEKS = 14;
export const PLAYOFF_SPOTS = 6;
export const BYE_SEEDS = 2;
export const GAMES_PLAYED = 11; // weeks completed so far
export const REMAINING_WEEKS = TOTAL_WEEKS - GAMES_PLAYED;
export const SIMULATIONS = 5000;

export const schedule = [
  ...MATCHUPS.map(m => ({ home: m.home.teamId, away: m.away.teamId, week: 12 })),
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

export function runSimulations(teams, overrides = {}) {
  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  const counts = {}, seedCounts = {}, champCounts = {}, byeCounts = {};
  teams.forEach(t => {
    counts[t.id] = 0;
    seedCounts[t.id] = Array(teams.length).fill(0);
    champCounts[t.id] = 0;
    byeCounts[t.id] = 0;
  });

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    const records = {}, pf = {};
    teams.forEach(t => {
      records[t.id] = { wins: t.wins, losses: t.losses };
      pf[t.id] = t.pf;
    });

    for (const game of schedule) {
      const key = `${game.home}-${game.away}-w${game.week}`;
      if (overrides[key] !== undefined) {
        if (overrides[key] === game.home) { records[game.home].wins++; records[game.away].losses++; }
        else { records[game.away].wins++; records[game.home].losses++; }
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

    // Playoff bracket: seeds 1-2 get first-round bye
    // Wild Card: 3v6, 4v5
    // Semis: 1 vs lowest remaining, 2 vs other
    // Championship: semi winners
    const p = ranked.slice(0, PLAYOFF_SPOTS).map(t => teamMap[t.id]);
    const wc1 = simGame(p[2], p[5]); // 3v6
    const wc2 = simGame(p[3], p[4]); // 4v5
    const wcW1 = teamMap[wc1], wcW2 = teamMap[wc2];
    // Higher seed plays lowest surviving seed
    const lowSurvivor = wcW1.power < wcW2.power ? wcW1 : wcW2;
    const highSurvivor = lowSurvivor === wcW1 ? wcW2 : wcW1;
    const sf1 = simGame(p[0], lowSurvivor);  // 1 vs lowest
    const sf2 = simGame(p[1], highSurvivor); // 2 vs other
    const champ = simGame(teamMap[sf1], teamMap[sf2]);
    champCounts[champ]++;
  }

  return teams.map(t => ({
    ...t,
    playoffPct: (counts[t.id] / SIMULATIONS) * 100,
    seedDist: seedCounts[t.id].map(c => (c / SIMULATIONS) * 100),
    champPct: (champCounts[t.id] / SIMULATIONS) * 100,
    byePct: (byeCounts[t.id] / SIMULATIONS) * 100,
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
