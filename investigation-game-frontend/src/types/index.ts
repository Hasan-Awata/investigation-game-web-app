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

export interface GameCase {
  id: number;
  title: string;
  story: string;
  min_player_XP: number;
  XP_on_solve: number;
  max_strikes: number; 
  img_url?: string; 
  levels?: Level[]; 
  evidences?: Evidence[]; 
  user_status?: 'solved' | 'failed' | null; 
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
  game_case?: GameCase;
  users?: RoomUser[];
  current_level?: Level;
  unlocked_evidences?: Evidence[]; 
  unlocked_levels?: Level[];
  completed_levels?: Level[];
  votes?: RoomVote[];
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
}

export interface Choice {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
  unlocks_evidence_id?: number | null; 
  unlocks_level_id?: number | null; 
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