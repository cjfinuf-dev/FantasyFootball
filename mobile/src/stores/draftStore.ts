import { create } from "zustand";
import * as draftsApi from "../api/drafts";

export interface DraftPick {
  id?: string;
  pick_number: number;
  member_id: string;
  player_id: string;
  round: number;
  player_name?: string;
  member_team_name?: string;
  picked_at?: string;
  amount?: number | null;
}

export interface DraftInfo {
  id: string;
  league_id: string;
  type: string;
  status: "scheduled" | "in_progress" | "complete";
  pick_time_limit: number;
  rounds: number;
  draft_order: string[] | null;
  current_pick: number;
  started_at: string | null;
  completed_at: string | null;
  total_picks: number;
  on_the_clock: string | null;
}

export interface DraftMember {
  id: string;
  team_name: string;
  username: string;
}

interface AvailablePlayer {
  id: string;
  full_name: string;
  position: string;
  team: string | null;
  status: string | null;
}

interface DraftState {
  draft: DraftInfo | null;
  picks: DraftPick[];
  members: DraftMember[];
  availablePlayers: AvailablePlayer[];
  timeRemaining: number;
  loading: boolean;
  error: string | null;

  fetchDraft: (leagueId: string) => Promise<void>;
  fetchBoard: (leagueId: string) => Promise<void>;
  fetchAvailable: (leagueId: string, position?: string, search?: string) => Promise<void>;
  startDraft: (leagueId: string) => Promise<void>;
  makePick: (leagueId: string, playerId: string) => Promise<void>;
  updateSettings: (leagueId: string, settings: { type?: string; pick_time_limit?: number; rounds?: number }) => Promise<void>;
  setOrder: (leagueId: string, order?: string[], randomize?: boolean) => Promise<void>;

  // WS-driven updates
  applyBoardUpdate: (data: { draft: DraftInfo; picks: DraftPick[]; members: DraftMember[] }) => void;
  applyPickMade: (pick: DraftPick, draftState: DraftInfo) => void;
  setTimeRemaining: (t: number) => void;
  reset: () => void;
}

const initial = {
  draft: null,
  picks: [],
  members: [],
  availablePlayers: [],
  timeRemaining: 0,
  loading: false,
  error: null,
};

export const useDraftStore = create<DraftState>((set, get) => ({
  ...initial,

  fetchDraft: async (leagueId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await draftsApi.getDraft(leagueId);
      set({ draft: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load draft", loading: false });
    }
  },

  fetchBoard: async (leagueId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await draftsApi.getDraftBoard(leagueId);
      set({ draft: data.draft, picks: data.picks, members: data.members, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load board", loading: false });
    }
  },

  fetchAvailable: async (leagueId, position, search) => {
    try {
      const { data } = await draftsApi.getAvailablePlayers(leagueId, { position, search });
      set({ availablePlayers: data });
    } catch {
      // silent — search failure is non-critical
    }
  },

  startDraft: async (leagueId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await draftsApi.startDraft(leagueId);
      set({ draft: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to start draft", loading: false });
    }
  },

  makePick: async (leagueId, playerId) => {
    try {
      await draftsApi.makePick(leagueId, playerId);
      // Board update comes via WebSocket
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Pick failed" });
    }
  },

  updateSettings: async (leagueId, settings) => {
    set({ loading: true, error: null });
    try {
      const { data } = await draftsApi.updateDraftSettings(leagueId, settings);
      set({ draft: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to update settings", loading: false });
    }
  },

  setOrder: async (leagueId, order, randomize) => {
    set({ loading: true, error: null });
    try {
      const { data } = await draftsApi.setDraftOrder(leagueId, {
        order: order ?? [],
        randomize: randomize ?? false,
      });
      set({ draft: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to set order", loading: false });
    }
  },

  applyBoardUpdate: (data) => {
    set({ draft: data.draft, picks: data.picks, members: data.members });
  },

  applyPickMade: (pick, draftState) => {
    set((s) => ({
      picks: [...s.picks, pick],
      draft: draftState,
      timeRemaining: draftState.status === "in_progress" ? s.draft?.pick_time_limit ?? 90 : 0,
    }));
  },

  setTimeRemaining: (t) => set({ timeRemaining: t }),

  reset: () => set(initial),
}));
