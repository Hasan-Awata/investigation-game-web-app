<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;

// Prefix with 'api' to inherit CORS, and enforce 'auth:sanctum' for the Bearer token
Broadcast::routes(['prefix' => 'api', 'middleware' => ['auth:sanctum']]);

Broadcast::channel('room.{roomId}', function (User $user, int $roomId) {
    $isParticipant = RoomUser::where('room_id', $roomId)
        ->where('user_id', $user->id)
        ->exists();

    return $isParticipant;
});