import client from "./client";

export interface PlayerSearchParams {
  search?: string;
  position?: string;
  team?: string;
  limit?: number;
  offset?: number;
}

export const searchPlayers = (params: PlayerSearchParams) =>
  client.get("/api/players", { params });

export const getPlayer = (id: string) =>
  client.get(`/api/players/${id}`);

export const getPlayerStats = (id: string, season?: number, week?: number) =>
  client.get(`/api/players/${id}/stats`, { params: { season, week } });

export const getPlayerProjections = (id: string, season?: number, week?: number) =>
  client.get(`/api/players/${id}/projections`, { params: { season, week } });

export const getTrendingPlayers = (trendType: string = "add", limit: number = 25) =>
  client.get("/api/players/trending", { params: { trend_type: trendType, limit } });

export const getPlayerCount = () =>
  client.get("/api/players/count");

export const syncPlayers = () =>
  client.post("/api/players/sync");

export const syncStats = (season: number, week: number) =>
  client.post("/api/players/sync-stats", null, { params: { season, week } });
