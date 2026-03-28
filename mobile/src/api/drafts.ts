import client from "./client";

export const getDraft = (leagueId: string) =>
  client.get(`/api/leagues/${leagueId}/draft`);

export const getDraftBoard = (leagueId: string) =>
  client.get(`/api/leagues/${leagueId}/draft/board`);

export const makePick = (leagueId: string, playerId: string) =>
  client.post(`/api/leagues/${leagueId}/draft/pick`, { player_id: playerId });

export const updateDraftSettings = (
  leagueId: string,
  settings: { type?: string; pick_time_limit?: number; rounds?: number }
) => client.put(`/api/leagues/${leagueId}/draft/settings`, settings);

export const setDraftOrder = (
  leagueId: string,
  body: { order?: string[]; randomize?: boolean }
) => client.put(`/api/leagues/${leagueId}/draft/order`, body);

export const startDraft = (leagueId: string) =>
  client.post(`/api/leagues/${leagueId}/draft/start`);

export const getAvailablePlayers = (
  leagueId: string,
  params?: { position?: string; search?: string; limit?: number }
) => client.get(`/api/leagues/${leagueId}/draft/available`, { params });
