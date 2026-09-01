import type { ReactNode } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import LevelBuilderGuard from '../Shared/LevelBuilderGuard';
import type { Question } from '@/types';

interface CanvasContext {
  levelId: string;
  selectedCase: any;
  selectedPhase: any;
  selectedLevel: any;
  savedNodes: Question[];
}

interface NodeBuilderCanvasProps {
  requiredType: 'interrogation' | 'location' | 'wiretap';
  title: string;
  children: (context: CanvasContext) => ReactNode;
}

export default function NodeBuilderCanvas({ requiredType, title, children }: NodeBuilderCanvasProps) {
  const { levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();

  const savedNodes: Question[] = selectedLevel?.questions || [];

  return (
    <LevelBuilderGuard requiredType={requiredType}>
      <div className={`${requiredType}-builder-container`}>
        <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
            // {title}
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Targeting: {selectedCase?.title} &gt; {selectedPhase?.title} &gt; {selectedLevel?.title}
          </span>
        </div>

        {/* Injecting the context down to the specific mechanic implementation */}
        {children({ levelId, selectedCase, selectedPhase, selectedLevel, savedNodes })}
      </div>
    </LevelBuilderGuard>
  );
}