import { DATA_SEASON, NFL_SCHEDULE_SEASON } from './seasonConfig';

if (NFL_SCHEDULE_SEASON !== DATA_SEASON) {
  console.warn(`[nflSchedule] Schedule season (${NFL_SCHEDULE_SEASON}) does not match DATA_SEASON (${DATA_SEASON}). Matchup-based valuations may be inaccurate.`);
}

// 2026 NFL Week 1 Schedule (projected)
// Season opens Thursday Sep 10, 2026
export const NFL_WEEK1 = [
  { away: 'KC', home: 'BAL', date: 'Thu Sep 10', time: '8:20 PM ET' },
  { away: 'PHI', home: 'GB', date: 'Fri Sep 11', time: '8:15 PM ET' },
  { away: 'CIN', home: 'CLE', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'BUF', home: 'MIA', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'DAL', home: 'NYG', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'PIT', home: 'ATL', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'HOU', home: 'IND', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'NO', home: 'CAR', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'JAX', home: 'TEN', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'CHI', home: 'DET', date: 'Sun Sep 13', time: '1:00 PM ET' },
  { away: 'ARI', home: 'WAS', date: 'Sun Sep 13', time: '4:05 PM ET' },
  { away: 'MIN', home: 'LA', date: 'Sun Sep 13', time: '4:25 PM ET' },
  { away: 'DEN', home: 'SEA', date: 'Sun Sep 13', time: '4:25 PM ET' },
  { away: 'TB', home: 'SF', date: 'Sun Sep 13', time: '4:25 PM ET' },
  { away: 'NYJ', home: 'LAC', date: 'Sun Sep 13', time: '8:20 PM ET' },
  { away: 'NE', home: 'LV', date: 'Mon Sep 14', time: '8:15 PM ET' },
];

// Look up a player's Week 1 opponent by NFL team abbreviation
// Returns { opp: 'BAL', location: 'away'|'home', gameTime: 'Thu 8:20 PM ET' } or null
export function getOpponent(nflTeam) {
  if (!nflTeam) return null;
  const upper = nflTeam.toUpperCase();
  for (const game of NFL_WEEK1) {
    if (game.away === upper) {
      return { opp: game.home, location: 'away', gameTime: game.date.split(' ').slice(0, 1)[0] + ' ' + game.time.replace(' ET', '') };
    }
    if (game.home === upper) {
      return { opp: game.away, location: 'home', gameTime: game.date.split(' ').slice(0, 1)[0] + ' ' + game.time.replace(' ET', '') };
    }
  }
  return null;
}

// 2026 NFL Bye Weeks (projected)
export const BYE_WEEKS = {
  ARI: 9, ATL: 11, BAL: 8, BUF: 12, CAR: 7, CHI: 10, CIN: 9, CLE: 6,
  DAL: 11, DEN: 8, DET: 5, GB: 10, HOU: 7, IND: 13, JAX: 6, KC: 12,
  LAC: 8, LA: 9, LV: 10, MIA: 11, MIN: 7, NE: 13, NO: 6, NYG: 11,
  NYJ: 12, PHI: 5, PIT: 8, SF: 10, SEA: 9, TB: 7, TEN: 6, WAS: 13,
};

export function getByeWeek(nflTeam) {
  if (!nflTeam) return null;
  return BYE_WEEKS[nflTeam.toUpperCase()] || null;
}
