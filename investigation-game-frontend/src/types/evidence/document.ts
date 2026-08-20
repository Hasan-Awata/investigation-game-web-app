import type { BaseEvidence } from './base';

export interface JournalMetadata {
  author: string;
  entry_date: string;
  content: string;
}

export interface FinancialTransaction {
  date: string;
  type: string;
  amount: string;
  status: string;
}

export interface FinancialMetadata {
  institution: string;
  account_holder: string;
  transactions: FinancialTransaction[];
}

export interface CorrespondenceMetadata {
  sender: string;
  recipient: string;
  subject: string;
  body: string;
}

export interface ContractMetadata {
  parties_involved: string[];
  agreement_terms: string;
  signatures_valid: boolean;
}

export interface MemoMetadata {
  written_by: string;
  context: string;
}

export interface BackgroundCheckMetadata {
  subject_name: string;
  dob: string;
  sex_age: string;
  aliases: string;
  last_known_address: string;
  employment_financial: string;
  criminal_history: string;
  associates: string;
  investigator_notes: string;
}

export type DocumentEvidence =
  | (BaseEvidence & { evidence_type: 'document'; sub_type: 'journal'; metadata: JournalMetadata })
  | (BaseEvidence & { evidence_type: 'document'; sub_type: 'financial'; metadata: FinancialMetadata })
  | (BaseEvidence & { evidence_type: 'document'; sub_type: 'correspondence'; metadata: CorrespondenceMetadata })
  | (BaseEvidence & { evidence_type: 'document'; sub_type: 'contract'; metadata: ContractMetadata })
  | (BaseEvidence & { evidence_type: 'document'; sub_type: 'memo'; metadata: MemoMetadata })
  | (BaseEvidence & { evidence_type: 'document'; sub_type: 'background_check'; metadata: BackgroundCheckMetadata });