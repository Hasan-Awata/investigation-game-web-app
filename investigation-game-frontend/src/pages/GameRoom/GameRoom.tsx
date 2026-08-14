import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameRoom } from '@/hooks/useGameRoom';
import { useViewedItems } from '@/hooks/useViewedItems'; 
import { RoomProvider, type ToastNotification, type GlobalFeedback } from '@/context/RoomContext';
import GameRoomLayout from './GameRoomLayout';
import './GameRoom.css';

interface LevelTransitionedPayload { message: string; status: string; stats?: any; }
interface WiretapTriggeredPayload { question_id: number; audio_url: string | null; message?: string; }

export default function GameRoom() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { room, isLoading, error, accumulatedEvidences, accumulatedSuspects, accumulatedVictims, refreshRoomData } = useGameRoom(inviteCode);

  const { viewedItems: viewedEvidences, markItemAsViewed: markEvidenceAsViewed } = useViewedItems(room?.invite_code, 'evidence');
  const { viewedItems: viewedSuspects, markItemAsViewed: markSuspectAsViewed } = useViewedItems(room?.invite_code, 'suspects');
  const { viewedItems: viewedVictims, markItemAsViewed: markVictimAsViewed } = useViewedItems(room?.invite_code, 'victims');
  
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);
  const [finalStats, setFinalStats] = useState<any>(room?.final_stats || null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [globalFeedback, setGlobalFeedback] = useState<GlobalFeedback | null>(null); // Added
  
  const playedAudioTracker = useRef<Set<number>>(new Set());

  const setGameOverData = useCallback((message: string, stats?: any) => {
    setResolutionMessage(message);
    if (stats) setFinalStats(stats);
  }, []);

  const addGlobalToast = useCallback((toastData: Omit<ToastNotification, 'id'>) => {
    const newToast: ToastNotification = { ...toastData, id: crypto.randomUUID() };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== newToast.id)), 5000);
  }, []);

  useEffect(() => {
    if (!room || !window.Echo) return;
    const channel = window.Echo.private(`room.${room.id}`);
    
    channel.listen('LevelTransitioned', (e: LevelTransitionedPayload) => {
      if (e.message) {
        if (e.status === 'active') {
          // Replaced window.alert with the global modal
          setGlobalFeedback({
            type: 'success',
            title: 'DEPARTMENT UPDATE',
            message: e.message
          });
          setTimeout(() => setGlobalFeedback(null), 4000);
        } else {
          setGameOverData(e.message, e.stats);
        }
      }
      refreshRoomData();
    });

    channel.listen('VoteLockedIn', () => refreshRoomData());

    channel.listen('WiretapTriggered', (e: WiretapTriggeredPayload) => {
      if (e.audio_url && !playedAudioTracker.current.has(e.question_id)) {
        playedAudioTracker.current.add(e.question_id);
        const audio = new Audio(e.audio_url);
        audio.play().catch(err => console.error('Browser blocked autoplay:', err));
      }

      addGlobalToast({
        type: 'evidence', 
        title: 'WIRETAP INTERCEPTED', 
        message: e.message || 'Audio feed active. Listen carefully.',
        icon: 'https://api.iconify.design/ph:waveform-duotone.svg?color=%23c48b36'
      });

      refreshRoomData();
    });

    return () => {
      channel.stopListening('LevelTransitioned');
      channel.stopListening('VoteLockedIn');
      channel.stopListening('WiretapTriggered');
    };
  }, [room?.id, refreshRoomData, setGameOverData, addGlobalToast]);

  if (isLoading) return <div className="terminal-text">Synchronizing session data...</div>;
  if (error || !room) return <div className="terminal-text error">{error || 'Session not found.'}</div>;

  return (
    <RoomProvider 
      room={room} accumulatedEvidences={accumulatedEvidences}
      accumulatedSuspects={accumulatedSuspects} accumulatedVictims={accumulatedVictims}
      refreshRoomData={refreshRoomData}
      viewedEvidences={viewedEvidences} markEvidenceAsViewed={markEvidenceAsViewed}
      viewedSuspects={viewedSuspects} markSuspectAsViewed={markSuspectAsViewed}
      viewedVictims={viewedVictims} markVictimAsViewed={markVictimAsViewed}
      setGameOverData={setGameOverData} addGlobalToast={addGlobalToast} 
      globalFeedback={globalFeedback} setGlobalFeedback={setGlobalFeedback} // Added
    >
      <GameRoomLayout resolutionMessage={resolutionMessage} finalStats={finalStats} toasts={toasts} />
    </RoomProvider>
  );
}