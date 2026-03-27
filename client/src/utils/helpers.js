import { PLAYERS } from '../data/players';
import { TEAMS } from '../data/teams';
import { PLAYER_VALUES } from '../data/rosters';

export function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

export function getPlayerById(id) { return PLAYERS.find(p => p.id === id); }
export function getTeamById(id) { return TEAMS.find(t => t.id === id); }

export function calcFairness(sendIds, receiveIds) {
  const sideA = sendIds.reduce((s, id) => s + (PLAYER_VALUES[id] || 0), 0);
  const sideB = receiveIds.reduce((s, id) => s + (PLAYER_VALUES[id] || 0), 0);
  const fairness = Math.max(0, Math.round(100 - Math.abs(sideA - sideB)));
  const assessment = fairness >= 75 ? 'Fair Trade' : fairness >= 50 ? 'Slightly Uneven' : 'Lopsided';
  return { fairness, sideA, sideB, assessment };
}

export function timeUntil(ts) {
  const diff = ts - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  return h + 'h ' + m + 'm';
}

export const POS_COLORS = { QB:'--pos-qb', RB:'--pos-rb', WR:'--pos-wr', TE:'--pos-te', K:'--pos-k', DEF:'--pos-def' };
export const POS_BG = { QB:'--pos-qb-bg', RB:'--pos-rb-bg', WR:'--pos-wr-bg', TE:'--pos-te-bg', K:'--pos-k-bg', DEF:'--pos-def-bg' };
