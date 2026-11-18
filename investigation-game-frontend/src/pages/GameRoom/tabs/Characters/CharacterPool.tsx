import { memo, useId } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Character } from '@/types';
import type { CharacterPoolId } from '@/utils/characterVerdict';
import CharacterCard from './CharacterCard';
import styles from './CharactersTab.module.css';

interface CharacterPoolProps {
  pool: CharacterPoolId;
  title: string;
  emptyMessage: string;
  characters: readonly Character[];
  viewedCharacters: ReadonlySet<number>;
  onReadIntel: (id: number) => void;
}

// Keep list work separate from the droppable's drag-context subscription.
const CharacterList = memo(function CharacterList({
  characters, viewedCharacters, onReadIntel, emptyMessage,
}: Omit<CharacterPoolProps, 'title' | 'pool'>) {
  return <div className={styles.cards}>
    {characters.map(character => <CharacterCard key={character.id} character={character}
      isUnread={!viewedCharacters.has(character.id)} onReadIntel={onReadIntel} />)}
    {!characters.length && <p className={styles.placeholder}>{emptyMessage}</p>}
  </div>;
});

export default function CharacterPool({ title, pool, ...listProps }: CharacterPoolProps) {
  const headingId = useId();
  const { isOver, setNodeRef } = useDroppable({ id: `${pool}-zone` });
  const className = [styles.pool, pool === 'guilty' && styles.suspects,
    isOver && styles.isDragOver].filter(Boolean).join(' ');

  return <section ref={setNodeRef} aria-labelledby={headingId} className={className}>
    <header className={styles.poolHeader}><h3 id={headingId}>{title}</h3></header>
    <CharacterList {...listProps} />
  </section>;
}
