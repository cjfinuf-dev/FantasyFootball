export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

export interface League {
  id: string;
  name: string;
  season: number;
  num_teams: number;
  scoring_type: string;
  status: string;
  invite_code?: string;
}

export interface Player {
  id: string;
  full_name: string;
  position: string;
  team: string;
  status?: string;
  injury_status?: string;
}

export interface DraftPick {
  id: string;
  member_id: string;
  player_id: string;
  round: number;
  pick_number: number;
}

export interface Matchup {
  id: string;
  week: number;
  team_a_id: string;
  team_b_id: string;
  team_a_score: number;
  team_b_score: number;
  is_playoff: boolean;
  is_complete: boolean;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  created_at: string;
}
