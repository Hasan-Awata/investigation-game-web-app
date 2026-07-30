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

    /**
     * Submit the room's locked-in votes for the current level to be assessed.
     */
    public function store(Request $request, GameRoom $room): JsonResponse
    {
        // Execute the domain logic to evaluate the team's consensus
        $result = $this->assessmentService->evaluateSubmission($room);

        // If validation fails (e.g., not all questions have votes)
        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Assessment Failed',
                'message' => $result->errorMessage
            ], 422);
        }

        // If the assessment ran successfully, it returns a status and a narrative message
        return response()->json([
            'status' => $result->value['status'],    
            'message' => $result->value['message'], 
            'unlocked_evidence' => $result->value['unlocked_evidence'] ?? [], 
            'room' => $room->load('currentLevel'),  
        ], 200);
    }
}