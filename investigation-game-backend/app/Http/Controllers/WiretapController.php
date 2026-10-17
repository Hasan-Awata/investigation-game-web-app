<?php

namespace App\Http\Controllers;

use App\Enums\RoomStatus;
use App\Events\WiretapAudioPlayed;
use App\Models\GameRoom;
use App\Models\Question;
use App\Support\Concerns\BroadcastsAfterCommit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WiretapController extends Controller
{
    use BroadcastsAfterCommit;

    public function play(Request $request, GameRoom $room): JsonResponse
    {
        if ($request->user()->id !== $room->host_user_id) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Only the Host can initiate the wiretap.'], 403);
        }

        $validated = $request->validate([
            'question_id' => ['required', 'integer', 'exists:questions,id'],
        ]);

        $questionId = (int) $validated['question_id'];

        return DB::transaction(function () use ($request, $room, $questionId): JsonResponse {
            $room = GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();

            if ($room->status !== RoomStatus::Active) {
                return response()->json(['error' => 'Invalid Action', 'message' => 'This investigation has already concluded.'], 400);
            }

            $question = Question::whereKey($questionId)
                ->whereHas('level.zone', fn ($zone) => $zone->where('case_id', $room->case_id))
                ->first();

            if (!$question) {
                return response()->json(['error' => 'Forbidden', 'message' => 'Question does not belong to this case.'], 403);
            }

            if (!$question->audio_url) {
                return response()->json(['error' => 'Invalid Request', 'message' => 'This intercept does not contain wiretap audio.'], 422);
            }

            if ($room->playedWiretaps()->wherePivot('question_id', $questionId)->exists()) {
                return response()->json(['status' => 'success', 'message' => 'This wiretap has already been burned. Signal lost.']);
            }

            $room->playedWiretaps()->syncWithoutDetaching([
                $questionId => ['played_by' => $request->user()->id],
            ]);

            $this->broadcastAfterCommit(new WiretapAudioPlayed($room->id, $questionId, $request->user()->id));

            return response()->json(['status' => 'success', 'message' => 'Wiretap broadcasted to room.']);
        });
    }
}
