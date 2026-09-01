import type { ReactNode } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

interface LevelBuilderGuardProps {
  requiredType: 'location' | 'wiretap' | 'interrogation';
  children: ReactNode;
}

export default function LevelBuilderGuard({ requiredType, children }: LevelBuilderGuardProps) {
  const { caseId, levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.levelBuilderGuard;

  if (!caseId || !levelId || !selectedCase || !selectedPhase || !selectedLevel) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>
          {t.missingContextTitle}
        </h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t.missingContextDesc(requiredType)}
        </p>
      </div>
    );
  }

  if (selectedLevel.presentation_type !== requiredType) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-crimson)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>
          {t.mismatchTitle}
        </h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t.mismatchDesc(selectedLevel.presentation_type, requiredType)}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}