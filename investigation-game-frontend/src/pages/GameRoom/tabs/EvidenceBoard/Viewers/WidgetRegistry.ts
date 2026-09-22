import type { ElementType } from 'react';
import { WidgetType, type WidgetType as WidgetTypeUnion } from '@/types/evidence';
import {
  AutopsyDiagram,
  Barcode,
  CalloutBox,
  DataGrid,
  DnaBands,
  KeyValueGrid,
  RawHtml,
  SignaturePad,
  SpectralGraph,
  StampOverlay,
  TerminalBlock,
  TextParagraph,
  TranscriptLog,
} from '../Widgets';

/**
 * Maps every implemented WidgetType to its React component.
 */
export const WidgetRegistry: Partial<Record<WidgetTypeUnion, ElementType>> = {
  [WidgetType.DataGrid]: DataGrid,
  [WidgetType.SignaturePad]: SignaturePad,
  [WidgetType.TextParagraph]: TextParagraph,
  [WidgetType.RawHtml]: RawHtml,
  [WidgetType.KeyValueGrid]: KeyValueGrid,
  [WidgetType.CalloutBox]: CalloutBox,
  [WidgetType.StampOverlay]: StampOverlay,
  [WidgetType.Barcode]: Barcode,
  [WidgetType.TranscriptLog]: TranscriptLog,
  [WidgetType.AutopsyDiagram]: AutopsyDiagram,
  [WidgetType.SpectralGraph]: SpectralGraph,
  [WidgetType.DnaBands]: DnaBands,
  [WidgetType.TerminalBlock]: TerminalBlock,
};

export type RegistryComponent = ElementType;