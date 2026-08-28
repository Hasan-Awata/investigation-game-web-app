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

  // We use a ref for the storage key so it's instantly available without triggering re-renders
  const storageKey = useRef(`notepad_fallback`);
  const isInitialized = useRef(false);

  // 1. Initialization and Cross-Tab Sync
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      if (currentUser) {
         storageKey.current = `room_${roomId}_user_${currentUser.id}_ledger`;
         const savedNotes = localStorage.getItem(storageKey.current);
         if (savedNotes) {
           setNotes(savedNotes);
         }
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }

    isInitialized.current = true;

    // Sync notes instantly if the user types in a different tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey.current && e.newValue !== null) {
        setNotes(e.newValue);
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
      localStorage.setItem(storageKey.current, notes);
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