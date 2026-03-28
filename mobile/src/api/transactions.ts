import client from "./client";

export const getTransactions = (leagueId: string, params?: { type?: string; status?: string }) =>
  client.get(`/api/leagues/${leagueId}/transactions`, { params });

export const proposeTrade = (
  leagueId: string,
  data: { to_member_id: string; send_player_ids: string[]; receive_player_ids: string[] }
) => client.post(`/api/leagues/${leagueId}/transactions/trade`, data);

export const claimWaiver = (
  leagueId: string,
  data: { player_id: string; drop_player_id?: string; bid_amount?: number }
) => client.post(`/api/leagues/${leagueId}/transactions/waiver`, data);

export const updateTransaction = (
  leagueId: string,
  txnId: string,
  action: "accept" | "reject" | "cancel" | "veto"
) => client.patch(`/api/leagues/${leagueId}/transactions/${txnId}`, { action });

export const processWaivers = (leagueId: string) =>
  client.post(`/api/leagues/${leagueId}/transactions/waivers/process`);
