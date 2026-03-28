import client from "./client";

export interface LeagueCreateData {
  name: string;
  season?: number;
  num_teams?: number;
  scoring_type?: string;
  waiver_type?: string;
  faab_budget?: number;
  playoff_teams?: number;
}

export const getMyLeagues = () => client.get("/api/leagues");

export const createLeague = (data: LeagueCreateData) => client.post("/api/leagues", data);

export const getLeague = (id: string) => client.get(`/api/leagues/${id}`);

export const updateLeague = (id: string, data: Partial<LeagueCreateData>) =>
  client.patch(`/api/leagues/${id}`, data);

export const deleteLeague = (id: string) => client.delete(`/api/leagues/${id}`);

export const joinLeagueById = (id: string) => client.post(`/api/leagues/${id}/join`);

export const joinLeagueByCode = (inviteCode: string) =>
  client.post("/api/leagues/join-by-code", { invite_code: inviteCode });

export const leaveLeague = (id: string) => client.post(`/api/leagues/${id}/leave`);

export const getLeagueMembers = (id: string) => client.get(`/api/leagues/${id}/members`);

export const setTeamName = (leagueId: string, teamName: string) =>
  client.patch(`/api/leagues/${leagueId}/team-name`, { team_name: teamName });

export const getStandings = (id: string) => client.get(`/api/leagues/${id}/standings`);
