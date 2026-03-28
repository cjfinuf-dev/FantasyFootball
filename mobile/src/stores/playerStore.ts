import { create } from "zustand";
import { searchPlayers, getPlayer, getPlayerStats, getTrendingPlayers, PlayerSearchParams } from "@/api/players";

export interface Player {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
  status: string | null;
  injury_status: string | null;
  age: number | null;
  years_exp: number | null;
}

export interface PlayerStat {
  player_id: string;
  season: number;
  week: number;
  stats: Record<string, number>;
  points_ppr: number | null;
  points_half: number | null;
  points_std: number | null;
}

export interface TrendingPlayer {
  player_id: string;
  count: number;
  player: Player | null;
}

interface PlayerState {
  searchResults: Player[];
  trending: TrendingPlayer[];
  selectedPlayer: Player | null;
  selectedPlayerStats: PlayerStat[];
  loading: boolean;
  search: (params: PlayerSearchParams) => Promise<void>;
  fetchTrending: () => Promise<void>;
  fetchPlayerDetail: (id: string) => Promise<void>;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  searchResults: [],
  trending: [],
  selectedPlayer: null,
  selectedPlayerStats: [],
  loading: false,

  search: async (params) => {
    set({ loading: true });
    try {
      const { data } = await searchPlayers(params);
      set({ searchResults: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchTrending: async () => {
    try {
      const { data } = await getTrendingPlayers();
      set({ trending: data });
    } catch {
      // Sleeper trending may fail occasionally, non-critical
    }
  },

  fetchPlayerDetail: async (id: string) => {
    set({ loading: true });
    try {
      const [playerRes, statsRes] = await Promise.all([
        getPlayer(id),
        getPlayerStats(id),
      ]);
      set({
        selectedPlayer: playerRes.data,
        selectedPlayerStats: statsRes.data,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  clear: () => set({ searchResults: [], selectedPlayer: null, selectedPlayerStats: [] }),
}));
