import { useMemo, type MouseEvent, type KeyboardEvent } from 'react';
import { useRoomData } from '@/context/RoomContext.shared';
import { useGameMutation } from './useGameMutation';
import { getLocalUser } from '@/utils/userState';
import type { Choice, RoomVote } from '@/types';
import { clearVote, startEncounterGroup, joinEncounterGroup, lockVote } from '@/services/api';

export type { ToastNotification, GlobalFeedback } from '@/context/RoomContext';

export function useInvestigationPhase() {
  const { room, refreshRoomData } = useRoomData();
  const currentUser = getLocalUser();
  const roomId = room.id;
  const activeGroup = room.encounter_groups?.find(group =>
    group.status === 'active' && group.members?.some(member => member.user_id === currentUser?.id)
  ) ?? null;

  const localVotes = useMemo(() => {
    const votes: Record<number, number> = {};
    activeGroup?.votes?.forEach((vote: RoomVote) => {
      if (vote.user_id === currentUser?.id) votes[vote.question_id] = vote.choice_id;
    });
    return votes;
  }, [activeGroup?.votes, currentUser?.id]);

  const voteMutation = useGameMutation({
    mutationFn: ({ questionId, choiceId }: { questionId: number; choiceId: number }) => lockVote(roomId, questionId, choiceId),
    onSuccess: refreshRoomData,
  });
  const clearMutation = useGameMutation({
    mutationFn: (questionId: number) => clearVote(roomId, questionId),
    onSuccess: refreshRoomData,
  });
  const startMutation = useGameMutation({
    mutationFn: (levelId: number) => startEncounterGroup(roomId, levelId),
    onSuccess: refreshRoomData,
  });
  const joinMutation = useGameMutation({
    mutationFn: (groupId: number) => joinEncounterGroup(roomId, groupId),
    onSuccess: refreshRoomData,
  });

  const handleSelectChoice = (event: MouseEvent | KeyboardEvent | undefined, questionId: number, choice: Choice, status: string) => {
    event?.stopPropagation();
    if (status !== 'active' || !activeGroup || activeGroup.current_question_id !== questionId) return;
    voteMutation.mutate({ questionId, choiceId: choice.id });
  };

  return {
    activeGroup,
    localVotes,
    isSubmitting: voteMutation.isPending || clearMutation.isPending,
    isInitiating: startMutation.isPending,
    isJoining: joinMutation.isPending,
    handleSelectChoice,
    clearVote: (questionId: number) => clearMutation.mutate(questionId),
    initiatePhase: (levelId: number) => startMutation.mutate(levelId),
    joinGroup: (groupId: number) => joinMutation.mutate(groupId),
    addToast: () => undefined,
  };
}
