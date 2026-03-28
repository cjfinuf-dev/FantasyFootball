import { create } from "zustand";
import * as matchupsApi from "../api/matchups";

interface MatchupData {
  id: string;
  week: number;
  team_a_id: string;
  team_b_id: string;
  team_a_name: string | null;
  team_b_name: string | null;
  team_a_score: number;
  team_b_score: number;
  is_playoff: boolean;
  is_complete: boolean;
}

interface RosterPlayer {
  player_id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  slot: string;
  points_this_week: number;
}

interface MatchupDetail {
  matchup: MatchupData;
  team_a_roster: RosterPlayer[];
  team_b_roster: RosterPlayer[];
}

interface MatchupState {
  matchups: MatchupData[];
  currentWeek: number;
  matchupDetail: MatchupDetail | null;
  loading: boolean;
  error: string | null;

  fetchMatchups: (leagueId: string, week?: number) => Promise<void>;
  fetchMatchupDetail: (leagueId: string, matchupId: string) => Promise<void>;
  setWeek: (week: number) => void;
  reset: () => void;
}

export const useMatchupStore = create<MatchupState>((set, get) => ({
  matchups: [],
  currentWeek: 1,
  matchupDetail: null,
  loading: false,
  error: null,

  fetchMatchups: async (leagueId, week) => {
    const w = week ?? get().currentWeek;
    set({ loading: true, error: null });
    try {
      const { data } = await matchupsApi.getMatchups(leagueId, w);
      set({ matchups: data, currentWeek: w, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load matchups", loading: false });
    }
  },

  fetchMatchupDetail: async (leagueId, matchupId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await matchupsApi.getMatchupDetail(leagueId, matchupId);
      set({ matchupDetail: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load matchup", loading: false });
    }
  },

  setWeek: (week) => set({ currentWeek: week }),

  reset: () => set({ matchups: [], currentWeek: 1, matchupDetail: null, loading: false, error: null }),
}));
