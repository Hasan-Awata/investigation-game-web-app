import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameRoom } from '@/hooks/useGameRoom';
import { useViewedItems } from '@/hooks/useViewedItems';
import { RoomDataProvider, RoomUIProvider, type ToastNotification, type GlobalFeedback } from '@/context/RoomContext';
import GameRoomLayout from './GameRoomLayout';
import type { GameRoom, Evidence, Suspect, Victim, Level } from '@/types';
import './GameRoom.css';

// --- ENRICHED PAYLOAD TYPINGS ---
interface LevelTransitionedPayload {
  message: string;
  status: string;
  stats?: any;
  room_patch?: {
    current_level_id?: number | null;
    status?: string;
    completed_levels?: Level[];
  };
}

interface WiretapTriggeredPayload {
  question_id: number;
  audio_url: string | null;
  message?: string;
  played_wiretap?: any;
}

interface VoteLockedInPayload {
  vote: any;
}

interface ItemsUnlockedPayload {
  unlocked_evidences?: Evidence[];
  unlocked_levels?: Level[];
  unlocked_suspects?: Suspect[];
  unlocked_victims?: Victim[];
  strikes?: number;
}

export default function GameRoom() {
  const { t } = useTranslation();
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const {
    room,
    isLoading,
    error,
    accumulatedEvidences,
    accumulatedSuspects,
    accumulatedVictims,
    refreshRoomData,
    patchRoomData
  } = useGameRoom(inviteCode);

  const { viewedItems: viewedEvidences, markItemAsViewed: markEvidenceAsViewed } = useViewedItems(room?.invite_code, 'evidence');
  const { viewedItems: viewedSuspects, markItemAsViewed: markSuspectAsViewed } = useViewedItems(room?.invite_code, 'suspects');
  const { viewedItems: viewedVictims, markItemAsViewed: markVictimAsViewed } = useViewedItems(room?.invite_code, 'victims');

  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);
  const [finalStats, setFinalStats] = useState<any>(room?.final_stats || null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [globalFeedback, setGlobalFeedback] = useState<GlobalFeedback | null>(null);

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

  const patchArray = useCallback((oldArr: any[] = [], newItems: any[] = []) => {
    const map = new Map(oldArr.map(item => [item.id, item]));
    newItems.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  }, []);

  useEffect(() => {
    if (!room || !window.Echo) return;
    const channel = window.Echo.private(`room.${room.id}`);

    // 1. Level Transitions & Game State
    channel.listen('LevelTransitioned', (e: LevelTransitionedPayload) => {
      if (e.message) {
        if (e.status === 'active') {
          setGlobalFeedback({
            type: 'success',
            title: t('pages.gameRoom.departmentUpdate'),
            message: e.message
          });
          setTimeout(() => setGlobalFeedback(null), 4000);
        } else {
          setGameOverData(e.message, e.stats);
        }
      }

      patchRoomData((oldRoom: GameRoom) => {
        const updatedCompletedLevels = e.room_patch?.completed_levels
          ? patchArray(oldRoom.completed_levels, e.room_patch.completed_levels)
          : oldRoom.completed_levels;

        return {
          ...oldRoom,
          status: e.room_patch?.status ?? oldRoom.status,
          current_level_id: e.room_patch?.current_level_id ?? oldRoom.current_level_id,
          completed_levels: updatedCompletedLevels
        };
      });
    });

    // 2. Voting / Dialogue Tree Selection
    channel.listen('VoteLockedIn', (e: VoteLockedInPayload) => {
      if (!e.vote) return;
      patchRoomData((oldRoom: GameRoom) => {
        const newVotes = [...(oldRoom.votes || [])];
        const existingVoteIndex = newVotes.findIndex(v => v.user_id === e.vote.user_id && v.question_id === e.vote.question_id);

        if (existingVoteIndex >= 0) {
          newVotes[existingVoteIndex] = e.vote;
        } else {
          newVotes.push(e.vote);
        }

        return { ...oldRoom, votes: newVotes };
      });
    });

    // 3. Audio / Wiretap Playback
    channel.listen('WiretapTriggered', (e: WiretapTriggeredPayload) => {
      if (e.audio_url && !playedAudioTracker.current.has(e.question_id)) {
        playedAudioTracker.current.add(e.question_id);
        const audio = new Audio(e.audio_url);
        audio.play().catch(err => console.error('Browser blocked autoplay:', err));
      }

      addGlobalToast({
        type: 'evidence',
        title: t('pages.gameRoom.wiretapIntercepted'),
        message: e.message || t('pages.gameRoom.audioFeedActive'),
        icon: 'https://api.iconify.design/ph:waveform-duotone.svg?color=%23c48b36'
      });

      if (e.played_wiretap) {
        patchRoomData((oldRoom: GameRoom) => {
          const playedWiretaps = [...(oldRoom.played_wiretaps || [])];
          if (!playedWiretaps.some(w => w.id === e.played_wiretap.id)) {
            playedWiretaps.push(e.played_wiretap);
          }
          return { ...oldRoom, played_wiretaps: playedWiretaps };
        });
      }
    });

    // 4. Discovery Engine (ItemsUnlocked)
    channel.listen('ItemsUnlocked', (e: ItemsUnlockedPayload) => {
      patchRoomData((oldRoom: GameRoom) => {
        return {
          ...oldRoom,
          unlocked_evidences: patchArray(oldRoom.unlocked_evidences, e.unlocked_evidences),
          unlocked_levels: patchArray(oldRoom.unlocked_levels, e.unlocked_levels),
          unlocked_suspects: patchArray(oldRoom.unlocked_suspects, e.unlocked_suspects),
          unlocked_victims: patchArray(oldRoom.unlocked_victims, e.unlocked_victims),
          strikes: e.strikes !== undefined ? e.strikes : oldRoom.strikes
        };
      });
    });

    channel.listen('LocationInspected', (e: any) => {
      patchRoomData((oldRoom: GameRoom) => ({
        ...oldRoom,
        inspections: [...(oldRoom.inspections || []), e.inspection]
      }));
    });

    channel.listen('RequestFiled', (e: any) => {
      patchRoomData((oldRoom: GameRoom) => ({
        ...oldRoom,
        filed_requests: [e.filed_request, ...(oldRoom.filed_requests || [])]
      }));
    });

    return () => {
      channel.stopListening('LevelTransitioned');
      channel.stopListening('VoteLockedIn');
      channel.stopListening('WiretapTriggered');
      channel.stopListening('ItemsUnlocked');
    };
  }, [room?.id, patchRoomData, patchArray, setGameOverData, addGlobalToast, t]);

  if (isLoading) return <div className="terminal-text">{t('pages.gameRoom.synchronizing')}</div>;
  if (error || !room) return <div className="terminal-text error">{error || t('pages.gameRoom.sessionNotFound')}</div>;

  return (
    <RoomDataProvider
      room={room}
      accumulatedEvidences={accumulatedEvidences}
      accumulatedSuspects={accumulatedSuspects}
      accumulatedVictims={accumulatedVictims}
      refreshRoomData={refreshRoomData}
    >
      <RoomUIProvider
        viewedEvidences={viewedEvidences} markEvidenceAsViewed={markEvidenceAsViewed}
        viewedSuspects={viewedSuspects} markSuspectAsViewed={markSuspectAsViewed}
        viewedVictims={viewedVictims} markVictimAsViewed={markVictimAsViewed}
        setGameOverData={setGameOverData} addGlobalToast={addGlobalToast}
        globalFeedback={globalFeedback} setGlobalFeedback={setGlobalFeedback}
      >
        <GameRoomLayout resolutionMessage={resolutionMessage} finalStats={finalStats} toasts={toasts} />
      </RoomUIProvider>
    </RoomDataProvider>
  );
}