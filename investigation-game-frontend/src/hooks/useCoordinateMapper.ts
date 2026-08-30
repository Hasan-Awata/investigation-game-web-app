import { useState, useCallback } from 'react';
import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';

export function useCoordinateMapper(
  choices: DraftChoice[],
  setChoices: (choices: DraftChoice[]) => void
) {
  const [activeCoordinateTarget, setActiveCoordinateTarget] = useState<string | number | null>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeCoordinateTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const yPercent = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);

    const targetChoice = choices.find(c => c.id === activeCoordinateTarget);
    let title = 'New Point';
    
    if (targetChoice && targetChoice.text.includes('|')) {
      title = targetChoice.text.split('|')[1].trim();
    } else if (targetChoice && targetChoice.text.trim() !== '') {
      title = targetChoice.text.trim();
    }

    setChoices(choices.map(c => 
      c.id === activeCoordinateTarget 
        ? { ...c, text: `${xPercent},${yPercent} | ${title}` } 
        : c
    ));
    
    setActiveCoordinateTarget(null);
  }, [activeCoordinateTarget, choices, setChoices]);

  return {
    activeCoordinateTarget,
    setActiveCoordinateTarget,
    handleImageClick
  };
}