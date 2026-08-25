import type { BaseEvidence } from './base';

export interface JournalPage {
  page_number: number;
  date_entry?: string;        
  content: string;
  is_torn?: boolean;          
}

export interface JournalMetadata {
  owner: string;
  cover_title?: string;       
  pages: JournalPage[];
}

export interface FinancialTransaction {
  date: string;
  description: string;        // e.g., "Wire Transfer - Shell Corp"
  amount: number;             // Negative for withdrawals, positive for deposits
}

export interface FinancialPage {
  page_number: number;
  statement_period: string;   
  transactions: FinancialTransaction[];
}

export interface FinancialMetadata {
  account_holder: string;
  institution_name: string;   
  account_number: string;
  pages: FinancialPage[];
}

export interface CorrespondenceMetadata {
  sender: string;
  recipient: string;
  subject: string;
  body: string;
}

export interface ContractPage {
  page_number: number;
  terms_text: string;         
}

export interface ContractMetadata {
  parties_involved: string[];
  signatures_valid: boolean;
  execution_date?: string;
  pages: ContractPage[];      
}

export interface MemoMetadata {
  written_by: string;
  context: string;
  style?: 'sticky' | 'notebook'; 
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