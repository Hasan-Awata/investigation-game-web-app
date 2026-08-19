import type { BaseEvidence } from './base';

export interface AutopsyMetadata {
  examiner: string;
  time_of_death: string;
  cause_of_death: string;
  anomalies: string;
}

export interface BallisticsMetadata {
  weapon_type: string;
  caliber: string;
  striation_match: boolean;
}

export interface DnaMetadata {
  sample_type: string;
  match_probability: string;
  identified_person: string | null;
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