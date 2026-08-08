<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Models\Question;
use App\Events\WiretapTriggered;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WiretapController extends Controller
{
    public function play(Request $request, GameRoom $room, Question $question): JsonResponse
    {
        // 1. Host Authorization Gate
        if ($request->user()->id !== $room->host_user_id) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Only the Host can initiate the wiretap.'], 403);
        }

        // 2. Validate Audio Exists
        if (!$question->audio_url) {
            return response()->json(['error' => 'Invalid Request', 'message' => 'This intercept does not contain wiretap audio.'], 422);
        }

        // 3. Playback State Lock (The "Play Once" Simulation)
        if ($room->playedWiretaps()->where('question_id', $question->id)->exists()) {
            return response()->json(['error' => 'Conflict', 'message' => 'This wiretap has already been burned. Signal lost.'], 409);
        }

        // 4. Burn the wiretap
        $room->playedWiretaps()->attach($question->id);

        // 5. Broadcast real-time playback to all squad members
        WiretapTriggered::dispatch($room, $question->id, $question->audio_url);

        return response()->json([
            'status' => 'success',
            'message' => 'Wiretap broadcasted to room.'
        ], 200);
    }
}