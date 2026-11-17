import { DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { Character, Evidence } from '@/types';
import { CharacterCardOverlay } from '../../tabs/Characters/CharacterCard';
import { EvidenceCardOverlay } from '../../tabs/EvidenceBoard/EvidenceCard';

interface RoomDragOverlayProps {
  evidence: Evidence | null | undefined;
  character: Character | null | undefined;
}

export default function RoomDragOverlay({ evidence, character }: RoomDragOverlayProps) {
  return (
    <DragOverlay dropAnimation={{
      sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
      duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    }}>
      {evidence ? (
        <EvidenceCardOverlay evidence={evidence} />
      ) : null}

      {character ? (
        <CharacterCardOverlay character={character} />
      ) : null}
    </DragOverlay>
  );
}
