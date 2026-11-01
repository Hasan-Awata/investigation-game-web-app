<?php

namespace App\Services;

use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\Character;
use App\Models\Evidence;
use App\Models\Level;
use App\Models\RoomUser;
use App\Models\User;
use App\Models\EncounterGroupMember;
use App\Models\EncounterGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Enums\RoomStatus;
use App\Enums\RoomLeaveReason;
use App\Enums\LevelPresentationType;
use App\Support\Result;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Events\HostMigrated;

class GameRoomService
{
    use BroadcastsAfterCommit;
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
                'status' => RoomStatus::Active,
            ]);

            RoomUser::create([
                'room_id' => $room->id,
                'user_id' => $host->id,
                'role' => 'host',
                'joined_at' => now(),
            ]);

            // Seed-on-create: snapshot every blueprint is_initial flag into runtime pivot state.
            $room->characters()->sync(
                $gameCase->characters()->get()->mapWithKeys(fn (Character $character) => [
                    $character->id => [
                        'status' => $character->default_status->value,
                        'is_unlocked' => (bool) $character->is_initial,
                    ],
                ])->all()
            );

            $initialEvidenceIds = Evidence::where('case_id', $gameCase->id)
                ->where('is_initial', true)
                ->pluck('id');
            $room->unlockedEvidences()->sync($initialEvidenceIds);

            $initialLevelIds = Level::whereHas('zone', fn ($q) => $q->where('case_id', $gameCase->id))
                ->where('is_initial', true)
                ->pluck('id');
            $room->unlockedLevels()->sync($initialLevelIds);

            return Result::success($room);
        });
    }

    /**
     * A source room can be restarted once per player, including after a lost response.
     */
    public function restartRoom(GameCase $gameCase, string $inviteCode, User $player): Result
    {
        return DB::transaction(function () use ($gameCase, $inviteCode, $player): Result {
            User::query()->whereKey($player->id)->lockForUpdate()->firstOrFail();
            $source = GameRoom::query()->where('invite_code', $inviteCode)
                ->where('case_id', $gameCase->id)->lockForUpdate()->first();
            if (!$source) {
                return Result::failure('This investigation is unavailable. Refresh the case list.');
            }

            $restart = DB::table('room_restarts')->where('source_room_id', $source->id)
                ->where('user_id', $player->id)->first();
            if ($restart) {
                $replacement = GameRoom::query()->find($restart->replacement_room_id);
                if (!$replacement || !$replacement->isParticipant((int) $player->id)) {
                    return Result::failure('The replacement investigation is unavailable. Refresh the case list.');
                }
                return Result::success($replacement);
            }

            if ($source->status !== RoomStatus::Active || !$source->users()->where('user_id', $player->id)->exists()) {
                return Result::failure('You can only restart an active investigation you participate in. Refresh the case list.');
            }
            if (EncounterGroupMember::query()->where('user_id', $player->id)->whereNull('left_at')
                ->whereHas('group', fn ($query) => $query->where('room_id', '!=', $source->id))->exists()) {
                return Result::failure('Leave your encounter in the other investigation before restarting this one.');
            }

            // Explicit departure abandons an empty room without recording a verdict or XP penalty.
            // In shared rooms it releases only this player and preserves the remaining investigation.
            $departure = $this->leaveRoom($source, $player);
            if ($departure->isFailure()) {
                throw new \RuntimeException('Restart departure failed.');
            }
            $created = $this->createRoom($gameCase, $player);
            if ($created->isFailure()) {
                throw new \RuntimeException('Restart room initialization failed.');
            }

            DB::table('room_restarts')->insert([
                'source_room_id' => $source->id,
                'user_id' => $player->id,
                'replacement_room_id' => $created->value->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return $created;
        });
    }

    /**
     * Process a player joining an existing active room via an invite code.
     */
    public function joinRoom(string $inviteCode, User $player): Result
    {
        return DB::transaction(function () use ($inviteCode, $player) {
            $room = GameRoom::where('invite_code', $inviteCode)
                ->lockForUpdate()
                ->first();

            if (!$room) {
                return Result::failure("Invalid or expired invite code.");
            }

            // Check if the user is already in the room
            $existingParticipant = RoomUser::where('room_id', $room->id)
                ->where('user_id', $player->id)
                ->exists();

            // Existing participants can resolve a concluded room after losing tab
            // storage. This lookup must never add membership to a terminal room.
            if ($room->status !== RoomStatus::Active && !$existingParticipant) {
                return Result::failure("Invalid or expired invite code.");
            }

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
    public function leaveRoom(GameRoom $room, User $player, RoomLeaveReason $reason = RoomLeaveReason::Explicit): Result
    {
        return DB::transaction(function () use ($room, $player, $reason) {
            User::query()->whereKey($player->id)->lockForUpdate()->firstOrFail();
            $room = GameRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();
            $roomUser = RoomUser::where('room_id', $room->id)
                ->where('user_id', $player->id)
                ->lockForUpdate()
                ->first();

            if (!$roomUser) {
                return Result::failure("You are not a participant in this room.");
            }

            $wasHost = ($room->host_user_id === $player->id);

            // Membership is durable for a lone host; browser absence is not abandonment.
            if ($reason === RoomLeaveReason::PageHide && (
                $room->status !== RoomStatus::Active ||
                ($wasHost && !$room->users()->where('user_id', '!=', $player->id)->exists())
            )) {
                return Result::success(['message' => 'Session preserved for resumption.']);
            }

            // 1. Remove the departing player
            $roomUser->delete();

            $membership = EncounterGroupMember::query()
                ->where('user_id', $player->id)
                ->whereHas('group', fn ($query) => $query->where('room_id', $room->id))
                ->whereNull('left_at')
                ->lockForUpdate()
                ->first();
            if ($membership) {
                $membership->update(['left_at' => now(), 'active_user_id' => null]);
                $group = EncounterGroup::query()->whereKey($membership->encounter_group_id)->lockForUpdate()->first();
                if ($group) {
                    DB::table('encounter_question_voters')
                        ->where('encounter_group_id', $group->id)
                        ->where('question_id', $group->current_question_id)
                        ->where('user_id', $player->id)
                        ->whereNull('left_at')
                        ->update(['left_at' => now(), 'updated_at' => now()]);
                    \App\Models\RoomVote::query()
                        ->where('encounter_group_id', $group->id)
                        ->where('question_id', $group->current_question_id)
                        ->where('user_id', $player->id)
                        ->delete();
                    $group->update(['finalizes_at' => null]);
                    if (!$group->members()->whereNull('left_at')->exists()) {
                        $group->update(['status' => 'abandoned', 'active_room_id' => null, 'active_level_id' => null, 'abandoned_at' => now()]);
                    }
                    app(EncounterGroupService::class)->membershipDeparted($group);
                }
            }

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

                    $this->broadcastAfterCommit(new HostMigrated($room, $nextPlayer->user));
                } elseif ($room->status === RoomStatus::Active) {
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

}
