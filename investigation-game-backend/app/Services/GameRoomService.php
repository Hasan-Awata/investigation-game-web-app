<?php

namespace App\Services;

use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Enums\RoomStatus;
use App\Support\Result;

class GameRoomService
{
    /**
     * Initialize a new game room and assign the creator as the Host.
     */
    public function createRoom(GameCase $gameCase, User $host): Result
    {
        return DB::transaction(function () use ($gameCase, $host) {
            $room = GameRoom::create([
                'case_id' => $gameCase->id,
                'host_user_id' => $host->id,
                'invite_code' => $this->generateUniqueInviteCode(),
                'current_level_id' => null, 
                'status' => RoomStatus::Active,
            ]);

            RoomUser::create([
                'room_id' => $room->id,
                'user_id' => $host->id,
                'role' => 'host',
                'joined_at' => now(),
            ]);

            return Result::success($room);
        });
    }

    /**
     * Process a player joining an existing active room via an invite code.
     */
    public function joinRoom(string $inviteCode, User $player): Result
    {
        return DB::transaction(function () use ($inviteCode, $player) {
            $room = GameRoom::where('invite_code', $inviteCode)
                ->where('status', RoomStatus::Active)
                ->lockForUpdate()
                ->first();

            if (!$room) {
                return Result::failure("Invalid or expired invite code.");
            }

            // Check if the user is already in the room
            $existingParticipant = RoomUser::where('room_id', $room->id)
                ->where('user_id', $player->id)
                ->exists();

            if (!$existingParticipant) {
                RoomUser::create([
                    'room_id' => $room->id,
                    'user_id' => $player->id,
                    'role' => 'participant',
                    'joined_at' => now(),
                ]);
            }

            return Result::success($room);
        });
    }

    /**
     * Generate a short, readable, and unique alphanumeric code for sharing.
     */
    private function generateUniqueInviteCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (GameRoom::where('invite_code', $code)->exists());

        return $code;
    }
}