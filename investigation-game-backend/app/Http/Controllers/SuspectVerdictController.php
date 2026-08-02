<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Services\AssessmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SuspectVerdictController extends Controller
{
    public function __construct(
        private readonly AssessmentService $assessmentService
    ) {}

    public function store(Request $request, GameRoom $room): JsonResponse
    {
        if ($request->user()->id !== $room->host_user_id) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only the assigned Room Host can submit the final indictment.'
            ], 403);
        }

        $validated = $request->validate([
            'guilty_suspect_ids' => 'required|array|min:1',
            'guilty_suspect_ids.*' => 'integer|exists:suspects,id'
        ]);

        $result = $this->assessmentService->evaluateFinalVerdict($room, $validated['guilty_suspect_ids']);

        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Assessment Failed',
                'message' => $result->errorMessage
            ], 422);
        }

        return response()->json($result->value, 200);
    }
}