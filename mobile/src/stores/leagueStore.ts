import { create } from "zustand";
import { getMyLeagues, getLeague, getLeagueMembers } from "@/api/leagues";

export interface League {
  id: string;
  name: string;
  season: number;
  num_teams: number;
  scoring_type: string;
  roster_slots: Record<string, number>;
  waiver_type: string;
  faab_budget: number;
  playoff_teams: number;
  status: string;
  commissioner_id: string;
  invite_code?: string;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  team_name: string | null;
  role: string;
  joined_at: string;
  username: string | null;
}

interface LeagueState {
  leagues: League[];
  currentLeague: League | null;
  members: LeagueMember[];
  loading: boolean;
  fetchLeagues: () => Promise<void>;
  fetchLeague: (id: string) => Promise<void>;
  fetchMembers: (id: string) => Promise<void>;
  setCurrentLeague: (league: League | null) => void;
  addLeague: (league: League) => void;
  removeLeague: (id: string) => void;
}

export const useLeagueStore = create<LeagueState>((set, get) => ({
  leagues: [],
  currentLeague: null,
  members: [],
  loading: false,

  fetchLeagues: async () => {
    set({ loading: true });
    try {
      const { data } = await getMyLeagues();
      set({ leagues: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchLeague: async (id: string) => {
    const { data } = await getLeague(id);
    set({ currentLeague: data });
  },

  fetchMembers: async (id: string) => {
    const { data } = await getLeagueMembers(id);
    set({ members: data });
  },

  setCurrentLeague: (currentLeague) => set({ currentLeague }),

  addLeague: (league) => set((s) => ({ leagues: [league, ...s.leagues] })),

  removeLeague: (id) => set((s) => ({
    leagues: s.leagues.filter((l) => l.id !== id),
    currentLeague: s.currentLeague?.id === id ? null : s.currentLeague,
  })),
}));
