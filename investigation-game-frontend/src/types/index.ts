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
  is_published?: boolean; 
  phases?: Phase[]; 
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
  played_wiretaps?: Question[]; 
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
  outcomes?: Record<string, any> | null; 
  requirements?: Record<string, any> | null; 
}

export interface Question {
  id: number;
  level_id: number;
  text: string;
  img_url?: string;
  audio_url?: string; 
  choices?: Choice[];
  is_mandatory: boolean; 
  assigned_user_id?: number; 
}

export const LevelPresentationType = {
  Standard: 'standard',
  Interrogation: 'interrogation',
  Location: 'location',
  Wiretap: 'wiretap', 
} as const;

export type LevelPresentationType = typeof LevelPresentationType[keyof typeof LevelPresentationType];

export interface Phase {
  id: number;
  case_id: number;
  title: string;
  description?: string;
  order_index: number;
  levels?: Level[]; 
}

export interface Level {
  id: number;
  phase_id: number;
  title: string;
  details: string;
  img_url?: string; 
  order_index: number;
  is_initial: boolean; 
  presentation_type?: LevelPresentationType; 
  required_request_id?: number | null; 
  questions?: Question[]; 
}

export const InvestigationRequestType = {
  SearchWarrant: 'search_warrant',
  FinancialSubpoena: 'financial_subpoena',
  ToxicologyReport: 'toxicology_report',
  WiretapAuthorization: 'wiretap_authorization',
  BallisticsAnalysis: 'ballistics_analysis',
  DigitalForensics: 'digital_forensics',
  ExhumationOrder: 'exhumation_order',
} as const;

export type InvestigationRequestType = typeof InvestigationRequestType[keyof typeof InvestigationRequestType];

export const getInvestigationRequestLabel = (type: string): string => {
  const labels: Record<string, string> = {
    search_warrant: 'Search Warrant Execution',
    financial_subpoena: 'Subpoena of Financial Records',
    toxicology_report: 'Advanced Toxicology Screen',
    wiretap_authorization: 'Communications Wiretap',
    ballistics_analysis: 'Firearm Ballistics Match',
    digital_forensics: 'Device Decryption & Forensics',
    exhumation_order: 'Coroner Exhumation Order',
  };
  return labels[type] || 'Procedural Request';
};