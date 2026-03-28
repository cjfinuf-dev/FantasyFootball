import client from "./client";

export const getMyRoster = (leagueId: string, week?: number) =>
  client.get(`/api/leagues/${leagueId}/rosters/me`, { params: { week } });

export const getAllRosters = (leagueId: string, week?: number) =>
  client.get(`/api/leagues/${leagueId}/rosters`, { params: { week } });

export const setLineup = (leagueId: string, lineup: Record<string, string>) =>
  client.put(`/api/leagues/${leagueId}/rosters/me/lineup`, { lineup });

export const addPlayer = (leagueId: string, playerId: string) =>
  client.post(`/api/leagues/${leagueId}/rosters/me/add`, { player_id: playerId });

export const dropPlayer = (leagueId: string, playerId: string) =>
  client.post(`/api/leagues/${leagueId}/rosters/me/drop`, { player_id: playerId });
