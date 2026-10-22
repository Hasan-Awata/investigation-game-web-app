<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Models\Question;
use App\Services\EncounterGroupService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VoteController extends Controller
{
    public function __construct(
        private readonly EncounterGroupService $encounterGroups
    ) {}

    public function store(Request $request, GameRoom $room, Question $question): JsonResponse
    {
        $validated = $request->validate([
            'choice_id' => 'required|exists:choices,id',
        ]);

        $user = $request->user();
        $result = $this->encounterGroups->vote($room, $question, (int) $validated['choice_id'], $user);

        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Validation Failed',
                'message' => $result->errorMessage
            ], 422);
        }

        return response()->json([
            'message' => 'Vote locked in.',
            'vote' => $result->value['vote'] ?? null,
            'group' => $result->value['group'],
        ], 200);
    }

    public function clear(Request $request, GameRoom $room, Question $question): JsonResponse
    {
        $result = $this->encounterGroups->clearVote($room, $question, $request->user());
        if ($result->isFailure()) {
            return response()->json(['error' => 'Validation Failed', 'message' => $result->errorMessage], 422);
        }
        return response()->json(['message' => 'Vote cleared.', 'group' => $result->value['group']], 200);
    }
}
