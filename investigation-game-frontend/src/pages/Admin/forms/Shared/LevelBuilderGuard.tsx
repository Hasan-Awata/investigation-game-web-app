import type { ReactNode } from 'react';
import { useAdminContext } from '@/context/AdminContext';

interface LevelBuilderGuardProps {
  requiredType: 'location' | 'wiretap' | 'interrogation';
  children: ReactNode;
}

export default function LevelBuilderGuard({ requiredType, children }: LevelBuilderGuardProps) {
  const { caseId, levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();

  if (!caseId || !levelId || !selectedCase || !selectedPhase || !selectedLevel) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>
          [ MISSING CONTEXT: TARGET LEVEL REQUIRED ]
        </h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Please select a Case, Phase, and Level from the sidebar to map {requiredType} data.
        </p>
      </div>
    );
  }

  if (selectedLevel.presentation_type !== requiredType) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-crimson)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>
          [ INVALID CONTEXT: LEVEL TYPE MISMATCH ]
        </h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          The currently selected level is configured for <strong>'{selectedLevel.presentation_type}'</strong>. You cannot build {requiredType} layouts here. Please select a '{requiredType}' level from the sidebar.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}