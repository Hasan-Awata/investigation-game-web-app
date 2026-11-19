export type Locale = 'en' | 'ar';
export type Label = Record<Locale, string>;
export type PaperType = 'document' | 'forensic';
export type ScalarField = {
  key: string;
  kind: 'text' | 'textarea' | 'date' | 'image';
  label: Label;
  required?: boolean;
  max?: number;
};
export type Field = ScalarField | {
  key: string;
  kind: 'rows';
  label: Label;
  required?: boolean;
  max: number;
  fields: ScalarField[];
};
export type Values = Record<string, string | Record<string, string>[]>;
export type Template = { id: string; version: number; values: Values };
export type Definition = {
  id: string;
  version: number;
  name: Label;
  category: Label;
  types: PaperType[];
  fields: Field[];
  characterPrefill?: { name: string; portrait?: string };
};
