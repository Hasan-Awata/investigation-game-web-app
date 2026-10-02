import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalUser } from '@/utils/userState';
import { getSafeStorage, setSafeStorage } from '@/utils/storage';
import '@/i18n';
import './AgentNotepad.css';

interface AgentNotepadProps {
  roomId: number;
}

export default function AgentNotepad({ roomId }: AgentNotepadProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // We use a ref for the storage key so it's instantly available without triggering re-renders
  const storageKey = useRef(`notepad_fallback`);
  const isInitialized = useRef(false);

  // 1. Initialization, Safe Hydration, and Cross-Tab Sync
  useEffect(() => {
    // Corruption purging is handled by getSafeStorage.
    const currentUser = getLocalUser();

    if (currentUser) {
      storageKey.current = `room_${roomId}_user_${currentUser.id}_ledger`;
      setNotes(getSafeStorage<string>('local', storageKey.current, ''));
    }

    isInitialized.current = true;

    // Sync notes instantly if the user types in a different tab.
    // Re-read through getSafeStorage: the stored payload is JSON-encoded, so
    // e.newValue is a quoted string and cannot be assigned to state directly.
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey.current && e.newValue !== null) {
        setNotes(getSafeStorage<string>('local', storageKey.current, ''));
        setIsSaved(true); // Flag as saved to prevent a redundant write-back in this tab
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [roomId]);

  // 2. Debounced Local Storage Write (The fix for Main Thread Blocking)
  useEffect(() => {
    // Guard clause: Don't trigger a write during initial mount or if state is already saved
    if (!isInitialized.current || isSaved) return;

    const timerId = setTimeout(() => {
      setSafeStorage('local', storageKey.current, notes);
      setIsSaved(true);
    }, 800);

    // Cleanup: If notes or isSaved change before 800ms, clear the timeout to prevent a race condition
    return () => clearTimeout(timerId);
  }, [notes, isSaved]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 3. UI updates instantly. The I/O side-effect is completely decoupled.
    setNotes(e.target.value);
    setIsSaved(false); 
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