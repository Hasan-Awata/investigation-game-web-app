import type { BaseEvidence } from './base';

export interface AutopsyMetadata {
  examiner: string;
  time_of_death: string;
  cause_of_death: string;
  anomalies: string;
  victim_name?: string;
  victim_age?: string | number;
  gender?: string;
  internal_exam?: string;
  toxicology_report?: string;
  evidence_collected?: string[];
}

export interface BallisticsExhibit {
  reference: string;
  description: string;
}

export interface ChainOfCustodyInfo {
  submitted_by: string;
  received_date: string;
}

export interface BallisticsMetadata {
  case_number: string;
  exhibits: BallisticsExhibit[];
  firearm_specs: string;
  microscopic_analysis: string;
  trajectory_range?: string;
  conclusion: string;
  examiner_name: string;
  investigator_notes?: string;
  caliber?: string;
  rifling_pattern?: string;
  firing_distance?: string;
  chain_of_custody?: ChainOfCustodyInfo;
}

export interface DnaMetadata {
  sample_type: string;
  match_probability: string;
  identified_person: string | null;
  lab_technician?: string;
  extraction_method?: string;
  loci_profile_summary?: string;
  lab_notes?: string;
}

export interface DigitalForensicsMetadata {
  device_type: string;
  extraction_method: string;
  recovered_data: string;
}

export interface TraceMetadata {
  material_type: string;
  origin_source: string;
}

export type ForensicEvidence =
  | (BaseEvidence & { evidence_type: 'forensic'; sub_type: 'autopsy'; metadata: AutopsyMetadata })
  | (BaseEvidence & { evidence_type: 'forensic'; sub_type: 'ballistics'; metadata: BallisticsMetadata })
  | (BaseEvidence & { evidence_type: 'forensic'; sub_type: 'dna'; metadata: DnaMetadata })
  | (BaseEvidence & { evidence_type: 'forensic'; sub_type: 'digital_forensics'; metadata: DigitalForensicsMetadata })
  | (BaseEvidence & { evidence_type: 'forensic'; sub_type: 'trace_analysis'; metadata: TraceMetadata });