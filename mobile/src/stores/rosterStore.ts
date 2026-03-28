import { create } from "zustand";
import * as rostersApi from "../api/rosters";

interface RosterPlayer {
  player_id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  slot: string;
  points_this_week: number;
  acquired_via: string | null;
}

interface RosterData {
  id: string | null;
  league_id: string;
  member_id: string;
  team_name: string | null;
  username?: string;
  players: RosterPlayer[];
}

interface RosterState {
  myRoster: RosterData | null;
  allRosters: RosterData[];
  loading: boolean;
  error: string | null;

  fetchMyRoster: (leagueId: string, week?: number) => Promise<void>;
  fetchAllRosters: (leagueId: string, week?: number) => Promise<void>;
  setLineup: (leagueId: string, lineup: Record<string, string>) => Promise<void>;
  addPlayer: (leagueId: string, playerId: string) => Promise<void>;
  dropPlayer: (leagueId: string, playerId: string) => Promise<void>;
  reset: () => void;
}

export const useRosterStore = create<RosterState>((set) => ({
  myRoster: null,
  allRosters: [],
  loading: false,
  error: null,

  fetchMyRoster: async (leagueId, week) => {
    set({ loading: true, error: null });
    try {
      const { data } = await rostersApi.getMyRoster(leagueId, week);
      set({ myRoster: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load roster", loading: false });
    }
  },

  fetchAllRosters: async (leagueId, week) => {
    set({ loading: true, error: null });
    try {
      const { data } = await rostersApi.getAllRosters(leagueId, week);
      set({ allRosters: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load rosters", loading: false });
    }
  },

  setLineup: async (leagueId, lineup) => {
    set({ loading: true, error: null });
    try {
      const { data } = await rostersApi.setLineup(leagueId, lineup);
      set({ myRoster: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to set lineup", loading: false });
    }
  },

  addPlayer: async (leagueId, playerId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await rostersApi.addPlayer(leagueId, playerId);
      set({ myRoster: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to add player", loading: false });
    }
  },

  dropPlayer: async (leagueId, playerId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await rostersApi.dropPlayer(leagueId, playerId);
      set({ myRoster: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to drop player", loading: false });
    }
  },

  reset: () => set({ myRoster: null, allRosters: [], loading: false, error: null }),
}));
