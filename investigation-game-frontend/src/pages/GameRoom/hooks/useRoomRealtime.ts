import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GlobalFeedback, ToastNotification } from '@/context/RoomContext.shared';
import type { Character, EncounterGroup, Evidence, FiledRequest, FinalStats, GameRoom, Level, RoomInspection, RoomQuestionResolution, RoomVote } from '@/types';
import { patchArray } from '@/utils/parsers';

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
  resolution: RoomQuestionResolution | null;
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
  strikes?: number | null;
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

interface RoomRealtimeOptions {
  roomId: GameRoom['id'] | undefined;
  patchRoomData: (update: (room: GameRoom) => GameRoom) => void;
  refreshRoomData: () => Promise<void>;
  setGlobalFeedback: (feedback: GlobalFeedback | null) => void;
  setGameOverData: (message: string, stats?: FinalStats) => void;
  addGlobalToast: (toast: Omit<ToastNotification, 'id'>) => void;
  scheduleTimeout: (callback: () => void, delay: number) => void;
}

export function useRoomRealtime({
  roomId,
  patchRoomData,
  refreshRoomData,
  setGlobalFeedback,
  setGameOverData,
  addGlobalToast,
  scheduleTimeout,
}: RoomRealtimeOptions) {
  const { t } = useTranslation();

  // Use the latest callbacks and translations without resubscribing on render.
  const tRef = useRef(t);
  const setGameOverDataRef = useRef(setGameOverData);
  const addGlobalToastRef = useRef(addGlobalToast);
  useEffect(() => {
    tRef.current = t;
    setGameOverDataRef.current = setGameOverData;
    addGlobalToastRef.current = addGlobalToast;
  });

  useEffect(() => {
    if (!roomId || !window.Echo) return;

    const echo = window.Echo;
    let previousStatus = echo.connectionStatus();
    const unsubscribeConnection = echo.connector.onConnectionChange(status => {
      const reconnected = status === 'connected' && previousStatus !== 'connected';
      previousStatus = status;
      if (reconnected && document.visibilityState === 'visible') void refreshRoomData();
    });
    const channel = echo.private(`room.${roomId}`);

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
        void refreshRoomData();
        return;
      }
      const resolution = event.resolution;
      patchRoomData((oldRoom: GameRoom) => {
        const groups = [...(oldRoom.encounter_groups ?? [])];
        const index = groups.findIndex(group => group.id === event.group_id);
        const previous = index >= 0 ? groups[index] : undefined;
        const updated: EncounterGroup = { ...previous, ...event, id: event.group_id };
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

    channel.listen('ItemsUnlocked', (e: ItemsUnlockedPayload) => {
      let requiresRefresh = false;

      patchRoomData((oldRoom: GameRoom) => {
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

          accumulated_characters: updatedCharacters,

          strikes: e.strikes ?? oldRoom.strikes
        };
      });

      if (requiresRefresh) {
        void refreshRoomData();
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
  }, [roomId, patchRoomData, refreshRoomData, setGlobalFeedback, scheduleTimeout]);
}
