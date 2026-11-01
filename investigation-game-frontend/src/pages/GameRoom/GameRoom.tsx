import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameRoom } from '@/hooks/useGameRoom';
import { useViewedItems } from '@/hooks/useViewedItems';
import { patchArray } from '@/utils/parsers';
import { RoomDataProvider, RoomUIProvider } from '@/context/RoomContext';
import type { ToastNotification, GlobalFeedback } from '@/context/RoomContext.shared';
import GameRoomLayout from './GameRoomLayout';
import type { GameRoom, Evidence, Character, Level, RoomVote, RoomInspection, FinalStats, FiledRequest, EncounterGroup } from '@/types';
import './GameRoom.module.css';

// --- ENRICHED PAYLOAD TYPINGS ---
interface LevelTransitionedPayload {
  message: string;
  status: string;
  stats?: FinalStats;
  room_patch?: {
    status?: string;
    completed_levels?: Level[];
  };
}

interface VoteLockedInPayload {
  vote: RoomVote;
}

interface EncounterGroupUpdatedPayload {
  group_id: number;
  room_id: number;
  level_id: number;
  creator_user_id: number;
  status: EncounterGroup['status'];
  current_question_id: number | null;
  finalizes_at: string | null;
  members: NonNullable<EncounterGroup['members']>;
  votes: RoomVote[];
  required_voter_ids: number[];
  tally: Record<number, number>;
  resolution: import('@/types').RoomQuestionResolution | null;
}

interface CharacterUpdatePayload extends Partial<Character> {
  character_id?: number;
  status?: string;
  is_unlocked?: boolean;
}

interface ItemsUnlockedPayload {
  unlocked_evidences?: Evidence[];
  unlocked_levels?: Level[];
  character_updates?: CharacterUpdatePayload[];
  strikes?: number;
  unlocked_location_point_ids?: number[];
}

interface HostMigratedPayload {
  room_id: number;
  new_host_id: number;
  new_host_name: string;
  message: string;
}

interface LocationInspectedPayload {
  inspection: RoomInspection;
}

interface RequestFiledPayload {
  filed_request: FiledRequest;
}

export default function GameRoom() {
  const { t } = useTranslation();
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const {
    room,
    isLoading,
    error,
    syncError,
    accessDenied,
    accumulatedEvidences,
    accumulatedCharacters,
    refreshRoomData,
    patchRoomData
  } = useGameRoom(inviteCode);

  const { viewedItems: viewedEvidences, markItemAsViewed: markEvidenceAsViewed } = useViewedItems(room?.invite_code, 'evidence');
  const { viewedItems: viewedCharacters, markItemAsViewed: markCharacterAsViewed } = useViewedItems(room?.invite_code, 'characters');

  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);
  const [finalStats, setFinalStats] = useState<FinalStats | null>(room?.final_stats || null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [globalFeedback, setGlobalFeedback] = useState<GlobalFeedback | null>(null);

  const timeoutsRef = useRef<number[]>([]);

  const setGameOverData = useCallback((message: string, stats?: FinalStats) => {
    setResolutionMessage(message);
    if (stats) setFinalStats(stats);
  }, []);

  const addGlobalToast = useCallback((toastData: Omit<ToastNotification, 'id'>) => {
    const newToast: ToastNotification = { ...toastData, id: crypto.randomUUID() };
    setToasts((prev) => [...prev, newToast]);
    const timeoutId = window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== newToast.id)),
      5000
    );
    timeoutsRef.current.push(timeoutId);
  }, []);

  // Latest-value refs: lets the Echo subscription effect below depend only on
  // stable identities (room id + memoised cache writers) instead of re-running
  // (and tearing down / re-subscribing the WebSocket channel) on every render.
  const tRef = useRef(t);
  const setGameOverDataRef = useRef(setGameOverData);
  const addGlobalToastRef = useRef(addGlobalToast);
  useEffect(() => {
    tRef.current = t;
    setGameOverDataRef.current = setGameOverData;
    addGlobalToastRef.current = addGlobalToast;
  });

  // Clear every tracked timer on unmount so no state update fires after teardown.
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const roomId = room?.id;
    if (!roomId || !window.Echo) return;

    const scheduleTimeout = (callback: () => void, delay: number) => {
      const id = window.setTimeout(callback, delay);
      timeoutsRef.current.push(id);
    };

    const echo = window.Echo;
    let previousStatus = echo.connectionStatus();
    const unsubscribeConnection = echo.connector.onConnectionChange(status => {
      const reconnected = status === 'connected' && previousStatus !== 'connected';
      previousStatus = status;
      if (reconnected && document.visibilityState === 'visible') void refreshRoomData();
    });
    const channel = echo.private(`room.${roomId}`);

    // 1. Level Transitions & Game State
    channel.listen('LevelTransitioned', (e: LevelTransitionedPayload) => {
      if (e.message) {
        if (e.status === 'active') {
          setGlobalFeedback({
            type: 'success',
            title: tRef.current('pages.gameRoom.departmentUpdate'),
            message: e.message
          });
          scheduleTimeout(() => setGlobalFeedback(null), 4000);
        } else {
          setGameOverDataRef.current(e.message, e.stats);
        }
      }

      patchRoomData((oldRoom: GameRoom) => {
        const updatedCompletedLevels = e.room_patch?.completed_levels
          ? patchArray(oldRoom.completed_levels, e.room_patch.completed_levels)
          : oldRoom.completed_levels;

        return {
          ...oldRoom,
          status: e.room_patch?.status ?? oldRoom.status,
          completed_levels: updatedCompletedLevels
        };
      });
      if (e.status !== 'active') void refreshRoomData();
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

    channel.listen('EncounterGroupUpdated', (event: EncounterGroupUpdatedPayload) => {
      if (event.room_id !== roomId || !event.status || !Array.isArray(event.members) || !Array.isArray(event.required_voter_ids)) {
        refreshRoomData();
        return;
      }
      const resolution = event.resolution;
      patchRoomData((oldRoom: GameRoom) => {
        const groups = [...(oldRoom.encounter_groups ?? [])];
        const index = groups.findIndex(group => group.id === event.group_id);
        const previous = index >= 0 ? groups[index] : undefined;
        const updated: EncounterGroup = { ...previous, ...event, id: event.group_id } as EncounterGroup;
        if (index >= 0) groups[index] = updated;
        else groups.push(updated);
        const resolutions = [...(oldRoom.question_resolutions ?? [])];
        if (resolution) {
          const resolutionIndex = resolutions.findIndex(item => item.id === resolution.id);
          if (resolutionIndex >= 0) resolutions[resolutionIndex] = resolution;
          else resolutions.push(resolution);
        }
        return { ...oldRoom, encounter_groups: groups, question_resolutions: resolutions };
      });
      if (event.status !== 'active') void refreshRoomData();
    });

    // 4. Discovery Engine (ItemsUnlocked)
    channel.listen('ItemsUnlocked', (e: ItemsUnlockedPayload) => {
      let requiresRefresh = false;

      patchRoomData((oldRoom: GameRoom) => {

        // Process character updates dynamically
        const updatedCharacters = [...(oldRoom.accumulated_characters || [])];

        if (e.character_updates && e.character_updates.length > 0) {
          e.character_updates.forEach(update => {
            const targetId = Number(update.id ?? update.character_id);

            // A partial update we cannot place (no id, or an unknown character
            // shipped without a name) must not fabricate a phantom card.
            if (!targetId) {
              requiresRefresh = true;
              return;
            }

            const index = updatedCharacters.findIndex(c => c.id === targetId);

            if (index !== -1) {
              // Overlay the sanitized update (no answer key) onto the known character.
              updatedCharacters[index] = {
                ...updatedCharacters[index],
                ...update,
                id: targetId,
                current_status: update.status ?? updatedCharacters[index].current_status,
              };
            } else if (update.name) {
              // Newly discovered person of interest shipped as a full object.
              updatedCharacters.push({ ...update, id: targetId } as Character);
            } else {
              requiresRefresh = true;
            }

            if (update.is_unlocked) {
              addGlobalToastRef.current({
                type: 'character',
                title: tRef.current('pages.gameRoom.hooks.phase.personOfInterest'),
                message: tRef.current('pages.gameRoom.hooks.phase.personOfInterestMsg'),
                icon: 'https://api.iconify.design/ph:user-focus-duotone.svg?color=%23a33232'
              });
            }
            if (update.status === 'deceased') {
              addGlobalToastRef.current({
                type: 'system',
                title: tRef.current('pages.gameRoom.hooks.phase.casualtyIdentified', 'Critical Update'),
                message: tRef.current('pages.gameRoom.hooks.phase.casualtyIdentifiedMsg', 'A person of interest has been confirmed deceased.'),
                icon: 'https://api.iconify.design/ph:skull-duotone.svg?color=%238a8d91'
              });
            }
          });
        }

        if (e.unlocked_evidences && e.unlocked_evidences.length > 0) {
          addGlobalToastRef.current({
            type: 'evidence',
            title: tRef.current('pages.gameRoom.hooks.phase.evidenceRecovered'),
            message: tRef.current('pages.gameRoom.hooks.phase.evidenceRecoveredMsg', { count: e.unlocked_evidences.length }),
            icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36'
          });
        }

        if (e.unlocked_levels && e.unlocked_levels.length > 0) {
          addGlobalToastRef.current({
            type: 'level',
            title: tRef.current('pages.gameRoom.hooks.phase.phaseUnlocked'),
            message: tRef.current('pages.gameRoom.hooks.phase.phaseUnlockedMsg'),
            icon: 'https://api.iconify.design/ph:git-merge-duotone.svg?color=%235a8a9e'
          });
        }

        return {
          ...oldRoom,
          available_location_point_ids: Array.from(new Set([...(oldRoom.available_location_point_ids ?? []), ...(e.unlocked_location_point_ids ?? [])])),
          unlocked_evidences: patchArray(oldRoom.unlocked_evidences, e.unlocked_evidences),
          accumulated_evidences: patchArray(oldRoom.accumulated_evidences, e.unlocked_evidences),

          unlocked_levels: patchArray(oldRoom.unlocked_levels, e.unlocked_levels),

          accumulated_characters: updatedCharacters, // Apply the patched character array

          strikes: e.strikes !== undefined ? e.strikes : oldRoom.strikes
        };
      });

      if (requiresRefresh) {
        refreshRoomData();
      }
    });

    channel.listen('LocationInspected', (e: LocationInspectedPayload) => {
      patchRoomData((oldRoom: GameRoom) => {
        // Idempotent: the inspecting client already has an optimistic copy, so
        // dedupe by choice_id rather than blindly appending.
        const others = (oldRoom.inspections || []).filter(
          (i: RoomInspection) => i.choice_id !== e.inspection.choice_id
        );
        return { ...oldRoom, inspections: [...others, e.inspection] };
      });
    });

    channel.listen('RequestFiled', (e: RequestFiledPayload) => {
      patchRoomData((oldRoom: GameRoom) => {
        // Drop the caller's optimistic `temp-*` placeholder (and any stale copy)
        // before prepending the authoritative server record.
        const existing = (oldRoom.filed_requests || []).filter(
          (req) =>
            !String(req.id).startsWith('temp-') &&
            Number(req.id) !== Number(e.filed_request.id)
        );

        return { ...oldRoom, filed_requests: [e.filed_request, ...existing] };
      });
    });

    channel.listen('HostMigrated', (e: HostMigratedPayload) => {
      setGlobalFeedback({
        type: 'success',
        title: tRef.current('pages.gameRoom.departmentUpdate', 'Department Update'),
        message: e.message
      });

      patchRoomData((oldRoom: GameRoom) => {
        const oldHostId = oldRoom.host_user_id;

        const updatedUsers = oldRoom.users
          ?.filter(u => u.user_id !== oldHostId)
          .map(u => {
            if (u.user_id === e.new_host_id) {
              return { ...u, role: 'host' as const };
            }
            return u;
          });

        return {
          ...oldRoom,
          host_user_id: e.new_host_id,
          users: updatedUsers
        };
      });

      scheduleTimeout(() => setGlobalFeedback(null), 5000);
    });

    return () => {
      unsubscribeConnection();
      channel.stopListening('LevelTransitioned');
      channel.stopListening('VoteLockedIn');
      channel.stopListening('EncounterGroupUpdated');
      channel.stopListening('ItemsUnlocked');
      channel.stopListening('LocationInspected');
      channel.stopListening('RequestFiled');
      channel.stopListening('HostMigrated');

      echo.leave(`room.${roomId}`);
    };
  }, [room?.id, patchRoomData, refreshRoomData]);

  if (accessDenied) return <div role="alert">{accessDenied} <a href="/">Return to menu</a></div>;
  if (isLoading) return <div className="terminal-text">{t('pages.gameRoom.synchronizing')}</div>;
  if (error || !room) return <div className="terminal-text error">{error || t('pages.gameRoom.sessionNotFound')}</div>;

  return (
    <RoomDataProvider
      room={room}
      accumulatedEvidences={accumulatedEvidences}
      accumulatedCharacters={accumulatedCharacters}
      refreshRoomData={refreshRoomData}
    >
      {syncError && <p role="status">{t('pages.gameRoom.syncDelayed', 'Unable to refresh progress. Showing the last saved state; retrying automatically.')}</p>}
      <RoomUIProvider
        viewedEvidences={viewedEvidences} markEvidenceAsViewed={markEvidenceAsViewed}
        viewedCharacters={viewedCharacters} markCharacterAsViewed={markCharacterAsViewed}
        setGameOverData={setGameOverData as (message: string, stats?: unknown) => void} addGlobalToast={addGlobalToast}
        globalFeedback={globalFeedback} setGlobalFeedback={setGlobalFeedback}
      >
        <GameRoomLayout resolutionMessage={resolutionMessage} finalStats={finalStats} toasts={toasts} />
      </RoomUIProvider>
    </RoomDataProvider>
  );
}
