import type { Evidence } from './evidence';
export * from './evidence';

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

export const CharacterStatus = {
  Available: 'available',
  Deceased: 'deceased',
  Fled: 'fled',
  Incarcerated: 'incarcerated'
} as const;

export type CharacterStatus = typeof CharacterStatus[keyof typeof CharacterStatus];

export const CharacterCharge = {
  Murder: 'murder',
  Fraud: 'fraud',
  Conspiracy: 'conspiracy',
  Blackmail: 'blackmail',
  Theft: 'theft',
  Accomplice: 'accomplice'
} as const;

export type CharacterCharge = typeof CharacterCharge[keyof typeof CharacterCharge];

export interface Character {
  id: number;
  case_id: number;
  name: string;
  background?: string;
  img_url?: string;
  is_initial: boolean;
  is_guilty?: boolean;
  charge?: CharacterCharge | string;
  default_status: CharacterStatus | string;
  current_status?: string;
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
  map_url?: string;
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
  zones?: Zone[]; 
  evidences?: Evidence[]; 
  characters?: Character[];
  investigation_requests?: InvestigationRequest[];
  user_status?: CaseUserStatus | null; 
}

export interface RoomVote {
  id: number;
  room_id: number;
  encounter_group_id: number;
  user_id: number;
  question_id: number;
  choice_id: number;
}

/**
 * Weighted-consensus outcome for one question (host weight = 2), shared by
 * CampaignTab and the phase components it feeds. Always produced by the
 * memoized O(1) lookup in CampaignTab — never recomputed inside render loops.
 */
export interface QuestionConsensus {
  votesCast: number;
  isResolved: boolean;
  isTie: boolean;
  winningChoiceId: number | null;
}

export const UNRESOLVED_CONSENSUS: QuestionConsensus = {
  votesCast: 0,
  isResolved: false,
  isTie: false,
  winningChoiceId: null,
};

export interface RoomInspection {
  id?: number;
  room_id: number;
  choice_id: number;
  is_dead_end: boolean;
}

export interface FiledRequest {
  id: number | string;
  request_type: string;
  created_at: string;
  evidence_ids: number[];
  character_ids?: number[];
}

export interface GameRoom {
  id: number;
  invite_code: string;
  case_id: number;
  host_user_id: number;
  status: string;
  strikes: number;
  final_stats?: FinalStats | null; 
  game_case?: GameCase;
  users?: RoomUser[];
  unlocked_evidences?: Evidence[]; 
  unlocked_levels?: Level[];
  completed_requests?: Pick<InvestigationRequest, 'id'>[];
  characters?: Character[];
  completed_levels?: Level[];
  votes?: RoomVote[];
  encounter_groups?: EncounterGroup[];
  question_resolutions?: RoomQuestionResolution[];
  available_location_point_ids?: number[];
  inspections?: RoomInspection[];
  filed_requests?: FiledRequest[];
  accumulated_evidences?: Evidence[];
  accumulated_characters?: Character[];
}

export interface FinalStats {
  time_taken: string;
  xp_gained: number;
  xp_awards?: Record<number, number>;
  max_xp: number;
  suspects_caught: number;
  total_guilty: number;
  innocents_accused: number;
}

export interface ChoiceOutcomes {
  feedback?: string;
  next_question_id?: number | null;
  gives_strike?: boolean;
  unlock_evidence?: number[];
  unlock_levels?: number[];
  unlock_location_points?: number[];
  unlock_suspects?: number[];
  unlock_victims?: number[];
  character_updates?: { id: number; is_unlocked?: boolean; status?: string }[];
}

export interface ChoiceRequirements {
  required_evidence?: number[];
  required_choices?: number[];
}

export interface Choice {
  id: number;
  question_id: number;
  text: string;
  /**
   * Narrative link to the next question in the dialogue tree. Hydrated at the
   * top level by the backend for player payloads because `outcomes` itself is
   * hidden from clients (answer key).
   */
  next_question_id?: number | null;
  /** Present only on admin payloads; stripped from player payloads. */
  outcomes?: ChoiceOutcomes | null;
  requirements?: ChoiceRequirements | null;
}

/**
 * Success payload returned by `POST /rooms/{room}/questions/{question}/vote`.
 * `character_updates` carries full sanitized Character objects (no
 * `is_guilty` / `charge`).
 */
export interface VoteResponse {
  message: string;
  vote: RoomVote | null;
  group: EncounterGroup;
}

export interface Question {
  id: number;
  level_id: number;
  order_index?: number;
  text: string;
  img_url?: string;
  choices?: Choice[];
}

export interface EncounterGroup {
  id: number;
  room_id: number;
  level_id: number;
  creator_user_id: number;
  status: 'active' | 'completed' | 'abandoned' | 'failed' | string;
  current_question_id: number | null;
  finalizes_at: string | null;
  members?: { user_id: number; joined_at: string; left_at?: string | null; user?: User }[];
  votes?: RoomVote[];
  required_voter_ids?: number[];
  tally?: Record<number, number>;
  resolution?: RoomQuestionResolution | null;
}

export interface RoomQuestionResolution {
  id: number;
  room_id: number;
  level_id: number;
  question_id: number;
  choice_id: number;
  encounter_group_id: number;
  resolved_at: string;
}

export const LevelPresentationType = {
  Interrogation: 'interrogation',
  Location: 'location',
} as const;

export type LevelPresentationType = typeof LevelPresentationType[keyof typeof LevelPresentationType];

export interface Zone {
  id: number;
  case_id: number;
  title: string;
  description?: string;
  order_index: number;
  coord_x?: number;
  coord_y?: number;
  levels?: Level[]; 
}

export interface Level {
  id: number;
  zone_id: number;
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
  FinancialRecords: 'financial_records',
  DnaTest: 'dna_test',
  PhoneRecords: 'phone_records',
} as const;

export type InvestigationRequestType = typeof InvestigationRequestType[keyof typeof InvestigationRequestType];

export const getInvestigationRequestLabel = (type: string): string => {
  const labels: Record<string, string> = {
    search_warrant: 'Search Warrant',
    financial_records: 'Retrieve financial records',
    dna_test: 'DNA test',
    phone_records: 'phone records',
  };
  return labels[type] || 'Procedural Request';
};

export interface InvestigationRequest {
  id: number;
  case_id: number;
  request_type: InvestigationRequestType | string; 
  unlocks_evidence_id?: number | null;
  unlocks_level_id?: number | null;
  required_evidences?: Evidence[];
  required_characters?: Character[];
  created_at?: string;
  updated_at?: string;
}
