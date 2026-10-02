import { useMemo } from 'react';
import { normalizeTerminal } from '@/types/evidence/terminal';
import ViewersContainer from '../Viewers/ViewersContainer';
import TerminalSheet from './TerminalSheet';

interface TerminalViewerProps {
  evidence: { id: number; metadata?: unknown };
  terminal?: unknown;
}

export default function TerminalViewer({ evidence, terminal }: TerminalViewerProps) {
  const resolved = useMemo(() => normalizeTerminal(terminal ?? evidence.metadata), [terminal, evidence.metadata]);

  return (
    <ViewersContainer evidence={evidence as { id: number; [key: string]: unknown }}>
      <TerminalSheet doc={resolved} evidenceId={evidence.id} />
    </ViewersContainer>
  );
}