<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Models\Question;
use App\Models\Choice;
use App\Services\VotingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VoteController extends Controller
{
    public function __construct(
        private readonly VotingService $votingService
    ) {}

    public function store(Request $request, GameRoom $room, Question $question): JsonResponse
    {
        // 1. Basic Laravel Form Validation
        $validated = $request->validate([
            'choice_id' => 'required|exists:choices,id',
        ]);

        $choice = Choice::find($validated['choice_id']);
        $user = $request->user();

        // 2. Execute Domain Logic
        $result = $this->votingService->lockInVote($room, $user, $question, $choice);

        // 3. Handle the Result
        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Validation Failed',
                'message' => $result->errorMessage
            ], 422);
        }

        return response()->json([
            'message' => 'Vote locked in successfully.',
            'data' => $result->value
        ], 200);
    }
}
