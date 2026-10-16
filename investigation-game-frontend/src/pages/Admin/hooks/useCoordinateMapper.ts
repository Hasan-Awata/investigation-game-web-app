import { useState, useCallback } from 'react';
import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';
import { formatCoordinateText, getChoiceCoordinate } from '@/pages/Admin/utils/coordinates';

export function useCoordinateMapper(
  choices: DraftChoice[],
  setChoices: (choices: DraftChoice[]) => void
) {
  const [activeCoordinateTarget, setActiveCoordinateTarget] = useState<string | number | null>(null);

  const handleCoordinateSelect = useCallback((x: string, y: string) => {
    if (!activeCoordinateTarget) return;

    const targetChoice = choices.find(c => c.id === activeCoordinateTarget);
    const existing = targetChoice ? getChoiceCoordinate(targetChoice) : null;
    const label = existing
      ? existing.label
      : (targetChoice?.text.trim() || 'New Point');

    const coordinate = { x, y, label };

    setChoices(choices.map(c =>
      c.id === activeCoordinateTarget
        ? { ...c, coordinate, text: formatCoordinateText(coordinate) }
        : c
    ));

    setActiveCoordinateTarget(null);
  }, [activeCoordinateTarget, choices, setChoices]);

  return {
    activeCoordinateTarget,
    setActiveCoordinateTarget,
    handleCoordinateSelect
  };
}
