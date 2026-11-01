import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { leaveRoom } from '@/services/api';
import { clearRoomSessionData } from '@/utils/storage';
import { useGameMutation } from './useGameMutation';
import type { GameRoom } from '@/types';

export function useLeaveRoom(room: GameRoom, onFailure: () => void) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useGameMutation({
    mutationFn: () => leaveRoom(room.id),
    onSuccess: () => {
      clearRoomSessionData(room.id, room.invite_code);
      queryClient.removeQueries({ queryKey: ['gameRoom', room.invite_code] });
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      navigate('/');
    },
    onError: onFailure,
  });
}
