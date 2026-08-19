export interface BaseEvidence {
  id: number;
  case_id: number;
  title: string;
  description?: string | null;
  img_url?: string | null;
  audio_url?: string | null;
  is_initial: boolean;
  is_vital_for_conviction: boolean;
  created_at?: string;
  updated_at?: string;
}