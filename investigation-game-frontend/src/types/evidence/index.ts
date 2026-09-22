export const EvidenceType = {
  Document: 'document',
  Forensic: 'forensic',
  Testimony: 'testimony',
  Image: 'image',
  Audio: 'audio',
  Digital: 'digital',
  Ballistics: 'ballistics'
} as const;

export type EvidenceType = typeof EvidenceType[keyof typeof EvidenceType];

export const WidgetType = {
  DataGrid: 'DataGrid',
  SignaturePad: 'SignaturePad',
  TextParagraph: 'TextParagraph',
  RawHtml: 'RawHtml',
  KeyValueGrid: 'KeyValueGrid',
  CalloutBox: 'CalloutBox',
  StampOverlay: 'StampOverlay',
  Barcode: 'Barcode',
  TranscriptLog: 'TranscriptLog',
  AutopsyDiagram: 'AutopsyDiagram',
  SpectralGraph: 'SpectralGraph',
  DnaBands: 'DnaBands',
  TerminalBlock: 'TerminalBlock'
} as const;

export type WidgetType = typeof WidgetType[keyof typeof WidgetType];

export interface WidgetBlock {
  id: string | number;
  type: WidgetType;
  props: Record<string, any>;
}

export interface WidgetPage {
  id: string | number;
  blocks: WidgetBlock[];
}

export interface Evidence {
  id: number;
  case_id: number;
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  theme?: string | null;
  pages?: WidgetPage[] | null;
  is_initial: boolean;
  is_vital_for_conviction: boolean;
  img_url?: string | null;
  audio_url?: string | null;
  created_at?: string;
  updated_at?: string;
}