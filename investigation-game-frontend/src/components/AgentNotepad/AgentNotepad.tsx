import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import './AgentNotepad.css';

interface AgentNotepadProps {
  roomId: number;
}

export default function AgentNotepad({ roomId }: AgentNotepadProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // We use a ref for the timer to debounce the "Saved" UI indicator
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // We use a ref for the storage key so it's instantly available without triggering re-renders
  const storageKey = useRef(`notepad_fallback`);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      if (currentUser) {
         storageKey.current = `room_${roomId}_user_${currentUser.id}_ledger`;
         const savedNotes = localStorage.getItem(storageKey.current);
         if (savedNotes) setNotes(savedNotes);
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }

    // Sync notes instantly if the user types in a different tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey.current && e.newValue !== null) {
        setNotes(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [roomId]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    setIsSaved(false);

    // Save to local storage instantly on every keystroke
    localStorage.setItem(storageKey.current, text);

    // Debounce the UI update so it doesn't flicker wildly while typing
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsSaved(true), 800);
  };

  return (
    <div className="sidebar-section agent-notepad-container">
      <div className="notepad-header">
        <h3 className="sidebar-heading" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          {t('components.agentNotepad.fieldLedger')}
        </h3>
        <span className={`save-indicator ${isSaved ? 'synced' : 'saving'}`}>
          {isSaved ? t('components.agentNotepad.synced') : t('components.agentNotepad.saving')}
        </span>
      </div>
      <textarea
        className="notepad-textarea"
        placeholder={t('components.agentNotepad.placeholder')}
        value={notes}
        onChange={handleNoteChange}
        spellCheck="false"
      />
    </div>
  );
}