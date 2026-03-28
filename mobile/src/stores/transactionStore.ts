import { create } from "zustand";
import * as txnApi from "../api/transactions";

interface TransactionData {
  id: string;
  league_id: string;
  type: string;
  status: string;
  proposed_by: string;
  proposed_by_name: string | null;
  proposed_at: string;
  resolved_at: string | null;
  details: Record<string, any>;
}

interface TransactionState {
  transactions: TransactionData[];
  loading: boolean;
  error: string | null;

  fetchTransactions: (leagueId: string, type?: string, status?: string) => Promise<void>;
  proposeTrade: (
    leagueId: string,
    toMemberId: string,
    sendPlayerIds: string[],
    receivePlayerIds: string[]
  ) => Promise<void>;
  claimWaiver: (
    leagueId: string,
    playerId: string,
    dropPlayerId?: string,
    bidAmount?: number
  ) => Promise<void>;
  respondToTransaction: (
    leagueId: string,
    txnId: string,
    action: "accept" | "reject" | "cancel" | "veto"
  ) => Promise<void>;
  reset: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (leagueId, type, status) => {
    set({ loading: true, error: null });
    try {
      const { data } = await txnApi.getTransactions(leagueId, { type, status });
      set({ transactions: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load transactions", loading: false });
    }
  },

  proposeTrade: async (leagueId, toMemberId, sendPlayerIds, receivePlayerIds) => {
    set({ loading: true, error: null });
    try {
      await txnApi.proposeTrade(leagueId, {
        to_member_id: toMemberId,
        send_player_ids: sendPlayerIds,
        receive_player_ids: receivePlayerIds,
      });
      await get().fetchTransactions(leagueId);
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to propose trade", loading: false });
    }
  },

  claimWaiver: async (leagueId, playerId, dropPlayerId, bidAmount) => {
    set({ loading: true, error: null });
    try {
      await txnApi.claimWaiver(leagueId, {
        player_id: playerId,
        drop_player_id: dropPlayerId,
        bid_amount: bidAmount,
      });
      await get().fetchTransactions(leagueId);
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to submit claim", loading: false });
    }
  },

  respondToTransaction: async (leagueId, txnId, action) => {
    set({ loading: true, error: null });
    try {
      await txnApi.updateTransaction(leagueId, txnId, action);
      await get().fetchTransactions(leagueId);
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Action failed", loading: false });
    }
  },

  reset: () => set({ transactions: [], loading: false, error: null }),
}));
