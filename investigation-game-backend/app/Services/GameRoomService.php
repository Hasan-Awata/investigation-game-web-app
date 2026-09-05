<?php

namespace App\Services;

use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Enums\RoomStatus;
use App\Enums\LevelPresentationType;
use App\Support\Result;
use App\Events\HostMigrated;

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
     * Process a player leaving the session and handle host migration if necessary.
     */
    public function leaveRoom(GameRoom $room, User $player): Result
    {
        return DB::transaction(function () use ($room, $player) {
            $roomUser = RoomUser::where('room_id', $room->id)
                ->where('user_id', $player->id)
                ->lockForUpdate()
                ->first();

            if (!$roomUser) {
                return Result::failure("You are not a participant in this room.");
            }

            $wasHost = ($room->host_user_id === $player->id);

            // 1. Remove the departing player
            $roomUser->delete();

            // 2. Handle Host Migration
            if ($wasHost) {
                // Identify the most senior remaining agent (oldest join date)
                $nextPlayer = RoomUser::with('user')
                    ->where('room_id', $room->id)
                    ->orderBy('joined_at', 'asc')
                    ->first();

                if ($nextPlayer) {
                    $room->update(['host_user_id' => $nextPlayer->user_id]);
                    $nextPlayer->update(['role' => 'host']);

                    HostMigrated::dispatch($room, $nextPlayer->user);
                } else {
                    // Mark the session as abandoned if completely empty
                    $room->update(['status' => RoomStatus::Failed]);
                }
            }

            return Result::success(['message' => 'Successfully disconnected from the session.']);
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

    /**
     * Dynamically assigns location points (questions) to players evenly.
     */
    public function distributeLocationQuestions(GameRoom $room): void
    {
        // Only run this logic if the current level is a Location type
        if ($room->currentLevel?->presentation_type !== LevelPresentationType::Location) {
            return;
        }

        // Get all active users in the room, sorted reliably by their ID
        $participants = $room->users()->orderBy('id')->get();
        $playerCount = $participants->count();

        if ($playerCount === 0) return;

        // Sort questions reliably
        $questions = $room->currentLevel->questions->sortBy('id')->values();

        foreach ($questions as $index => $question) {
            // Modulo arithmetic ensures an even, deterministic split
            $assignedParticipant = $participants[$index % $playerCount];

            // Dynamically append the assigned user ID to the model
            // This won't save to the DB, it just attaches to the JSON payload
            $question->setAttribute('assigned_user_id', $assignedParticipant->user_id);
        }
    }
}