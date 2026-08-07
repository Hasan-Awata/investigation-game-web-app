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
        $validated = $request->validate([
            'choice_id' => 'required|exists:choices,id',
        ]);

        $choice = Choice::find($validated['choice_id']);
        $user = $request->user();

        $result = $this->votingService->lockInVote($room, $user, $question, $choice);

        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Validation Failed',
                'message' => $result->errorMessage
            ], 422);
        }

        return response()->json([
            'message' => 'Vote locked in successfully.',
            'data' => $result->value['vote'],
            'unlocked_evidence' => $result->value['unlocked']['evidence'], 
            'unlocked_levels' => $result->value['unlocked']['levels'],     
            'unlocked_suspects' => $result->value['unlocked']['suspects'], 
            'unlocked_victims' => $result->value['unlocked']['victims']    
        ], 200);
    }
}
