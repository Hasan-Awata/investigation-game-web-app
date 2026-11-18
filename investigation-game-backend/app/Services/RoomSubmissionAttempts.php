<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Support\Result;
use Closure;
use Illuminate\Support\Facades\DB;

class RoomSubmissionAttempts
{
    /** @param Closure(): Result $submit */
    public function run(GameRoom $room, int $userId, string $action, ?string $attemptId, array $payload, Closure $submit): Result
    {
        if ($attemptId === null) {
            return $submit();
        }

        return DB::transaction(function () use ($room, $userId, $action, $attemptId, $payload, $submit): Result {
            GameRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();

            $key = ['room_id' => $room->id, 'user_id' => $userId, 'action' => $action, 'attempt_id' => $attemptId];
            $hash = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));
            $existing = DB::table('room_submission_attempts')->where($key)->first();

            if ($existing) {
                if ($existing->payload_hash !== $hash) {
                    return Result::failure('This attempt was already used for a different submission.');
                }

                return Result::success(json_decode($existing->result, true, flags: JSON_THROW_ON_ERROR));
            }

            $result = $submit();
            if ($result->isSuccess) {
                DB::table('room_submission_attempts')->insert($key + [
                    'payload_hash' => $hash,
                    'result' => json_encode($result->value, JSON_THROW_ON_ERROR),
                ]);
            }

            return $result;
        });
    }
}
