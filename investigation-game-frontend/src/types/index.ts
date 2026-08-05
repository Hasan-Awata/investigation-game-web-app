export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  XP: number;
  is_admin?: boolean;
}

export interface RoomUser {
  id: number;
  room_id: number;
  user_id: number;
  role: 'host' | 'participant';
  user?: User; 
}

export interface Suspect {
  id: number;
  case_id: number;
  name: string;
  background?: string;
  img_url?: string;
  is_initial: boolean;
}

export interface Victim {
  id: number;
  case_id: number;
  name: string;
  background?: string;
  img_url?: string;
  is_initial: boolean;
}

export const CaseUserStatus = {
  SolvedPerfect: 'solved_perfect',
  SolvedPartial: 'solved_partial',
  FailedNoProof: 'failed_no_proof',
  FailedIncomplete: 'failed_incomplete',
  FailedStrikes: 'failed_strikes',
} as const;
// 2. Extract the values into a TypeScript type of the exact same name
export type CaseUserStatus = typeof CaseUserStatus[keyof typeof CaseUserStatus];

export interface GameCase {
  id: number;
  title: string;
  story: string;
  min_player_XP: number;
  XP_on_solve: number;
  max_strikes: number; 
  rating_stars?: number;
  age_rating?: string;
  estimated_playtime?: string;
  difficulty?: string;
  tags?: string[];
  author_name?: string;
  img_url?: string; 
  active_room_invite_code?: string; 
  levels?: Level[]; 
  evidences?: Evidence[]; 
  suspects?: Suspect[];
  victims?: Victim[];
  user_status?: CaseUserStatus | null; 
}

export interface RoomVote {
  id: number;
  room_id: number;
  user_id: number;
  question_id: number;
  choice_id: number;
}

export interface GameRoom {
  id: number;
  invite_code: string;
  case_id: number;
  host_user_id: number;
  current_level_id: number;
  status: string;
  strikes: number;
  final_stats?: FinalStats | null; 
  game_case?: GameCase;
  users?: RoomUser[];
  current_level?: Level;
  unlocked_evidences?: Evidence[]; 
  unlocked_levels?: Level[];
  unlocked_suspects?: Suspect[];
  unlocked_victims?: Victim[];
  completed_levels?: Level[];
  votes?: RoomVote[];
}

export interface FinalStats {
  time_taken: string;
  xp_gained: number;
  max_xp: number;
  suspects_caught: number;
  total_guilty: number;
  innocents_accused: number;
}

export type EvidenceType = 'document' | 'testimony' | 'audio' | 'image' | 'forensic';

export interface Evidence {
  id: number;
  case_id: number; 
  title: string;
  description?: string;
  evidence_type: EvidenceType;
  audio_url?: string;
  img_url?: string;
  paragraph?: string;
  is_initial: boolean; 
  is_vital_for_conviction: boolean;
}

export interface Choice {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
  unlocks_evidence_id?: number | null; 
  unlocks_level_id?: number | null; 
  unlocks_suspect_id?: number | null;
  unlocks_victim_id?: number | null;
}

export interface Question {
  id: number;
  level_id: number;
  text: string;
  img_url?: string;
  msg_when_wrong?: string;
  choices?: Choice[];
  is_mandatory: boolean; 
}

export interface Level {
  id: number;
  case_id: number;
  title: string;
  details: string;
  img_url?: string; 
  order_index: number;
  is_initial: boolean; 
  questions?: Question[]; 
}