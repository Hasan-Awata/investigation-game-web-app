import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import type { Character } from '@/types';
import styles from './CharacterCard.module.css';

interface CharacterCardProps {
  character: Character;
  isUnread: boolean;
  onReadIntel: (characterId: number) => void;
}

function CharacterPortrait({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.portrait} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4 21v-2a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v2Z" />
        </svg>
      )}
    </div>
  );
}

function CharacterFace({ character }: { character: Character }) {
  const { t } = useTranslation();

  return (
    <>
      <CharacterPortrait key={character.img_url} src={character.img_url} />
      <div className={styles.identity}>
        <h4 className={styles.characterName} dir="auto">{character.name}</h4>
        {character.current_status === 'deceased' && (
          <span className={styles.deceasedStamp}>{t('pages.gameRoom.characters.deceased')}</span>
        )}
      </div>
    </>
  );
}

export default function CharacterCard({ character, isUnread, onReadIntel }: CharacterCardProps) {
  const { t } = useTranslation();
  const [showIntel, setShowIntel] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const intelId = useId();
  const intelHeadingId = useId();
  const unreadId = useId();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `character-${character.id}`,
    disabled: showIntel,
    data: { type: 'CHARACTER', characterId: character.id },
  });

  const closeIntel = () => {
    setShowIntel(false);
    toggleRef.current?.focus();
  };

  const toggleLabel = t(showIntel ? 'pages.gameRoom.suspects.card.closeIntel' : 'pages.gameRoom.suspects.card.viewIntel');

  return (
    <div
      className={styles.characterCard}
      data-dragging={isDragging}
      data-unread={isUnread || undefined}
      onKeyDown={(event) => {
        if (!showIntel || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        closeIntel();
      }}
    >
      <div
        ref={setNodeRef}
        {...(showIntel ? undefined : listeners)}
        role={showIntel ? undefined : 'group'}
        aria-roledescription={showIntel ? undefined : attributes['aria-roledescription']}
        className={styles.face}
        data-draggable={!showIntel}
      >
        <CharacterFace character={character} />
      </div>

      <button
        ref={toggleRef}
        type="button"
        className={styles.intelToggle}
        aria-label={toggleLabel}
        aria-expanded={showIntel}
        aria-controls={intelId}
        aria-describedby={isUnread ? unreadId : undefined}
        title={toggleLabel}
        onClick={() => {
          if (showIntel) {
            closeIntel();
            return;
          }
          setShowIntel(true);
          if (isUnread) onReadIntel(character.id);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {showIntel ? <path d="m6 6 12 12M18 6 6 18" /> : (
            <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M7 12h10m-10 3h6" /></>
          )}
        </svg>
      </button>

      {isUnread && <span id={unreadId} hidden>{t('pages.gameRoom.characterFolio.unreadIntel')}</span>}

      <div id={intelId} className={styles.intelPanel} hidden={!showIntel}>
        <h5 id={intelHeadingId} className={styles.intelHeading}>{t('pages.gameRoom.suspects.card.backgroundIntel')}</h5>
        <section
          className={styles.intelReader}
          aria-labelledby={intelHeadingId}
          tabIndex={showIntel ? 0 : undefined}
        >
          <p>{character.background?.trim() ? character.background : t('pages.gameRoom.suspects.card.noBackground')}</p>
        </section>
      </div>
    </div>
  );
}

export function CharacterCardOverlay({ character }: { character: Character }) {
  return (
    <div className={styles.characterCard} aria-hidden="true">
      <CharacterFace character={character} />
    </div>
  );
}
