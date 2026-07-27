<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;

Broadcast::channel('room.{roomId}', function (User $user, int $roomId) {
    // Check if the authenticated user has a record in the room_users table for this room
    $isParticipant = RoomUser::where('room_id', $roomId)
        ->where('user_id', $user->id)
        ->exists();

    // If true, Reverb allows the WebSocket connection. If false, it returns a 403.
    return $isParticipant;
});