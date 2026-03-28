import client from "./client";

export const getMatchups = (leagueId: string, week?: number) =>
  client.get(`/api/leagues/${leagueId}/matchups`, { params: { week } });

export const getMatchupDetail = (leagueId: string, matchupId: string) =>
  client.get(`/api/leagues/${leagueId}/matchups/${matchupId}`);

export const generateSchedule = (leagueId: string, weeks: number = 14) =>
  client.post(`/api/leagues/${leagueId}/matchups/generate`, null, { params: { weeks } });

export const scoreWeek = (leagueId: string, week: number) =>
  client.post(`/api/leagues/${leagueId}/matchups/score`, null, { params: { week } });

export const finalizeWeek = (leagueId: string, week: number) =>
  client.post(`/api/leagues/${leagueId}/matchups/finalize`, null, { params: { week } });
