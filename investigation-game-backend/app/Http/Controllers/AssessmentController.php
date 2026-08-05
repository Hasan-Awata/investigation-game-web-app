<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Services\AssessmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AssessmentController extends Controller
{
    public function __construct(
        private readonly AssessmentService $assessmentService
    ) {}

    public function store(Request $request, GameRoom $room): JsonResponse
    {
        $result = $this->assessmentService->evaluateSubmission($room);

        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Assessment Failed',
                'message' => $result->errorMessage
            ], 422);
        }

        return response()->json([
            'status' => $result->value['status'],    
            'message' => $result->value['message'], 
            'unlocked_evidence' => $result->value['unlocked_evidence'] ?? [], 
            'unlocked_levels' => $result->value['unlocked_levels'] ?? [],
            'unlocked_suspects' => $result->value['unlocked_suspects'] ?? [],
            'unlocked_victims' => $result->value['unlocked_victims'] ?? [],  
            'room' => $room->load('currentLevel'),  
        ], 200);
    }
}