<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Services\AssessmentService;
use App\Services\RoomSubmissionAttempts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuspectVerdictController extends Controller
{
    public function __construct(
        private readonly AssessmentService $assessmentService,
    ) {}

    public function store(Request $request, GameRoom $room, RoomSubmissionAttempts $attempts): JsonResponse
    {
        if ($request->user()->id !== $room->host_user_id) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only the assigned Room Host can submit the final indictment.'
            ], 403);
        }

        $validated = $request->validate([
            'attempt_id' => ['sometimes', 'required', 'uuid'],
            'guilty_character_ids' => 'present|array',
            'guilty_character_ids.*' => 'integer|exists:characters,id',
            'presented_evidence_ids' => 'sometimes|nullable|array',
            'presented_evidence_ids.*' => 'integer|exists:evidences,id',
        ]);

        $attemptId = $validated['attempt_id'] ?? null;
        unset($validated['attempt_id']);
        $result = $attempts->run(
            $room,
            $request->user()->id,
            'verdict',
            $attemptId,
            $validated,
            fn () => $this->assessmentService->evaluateFinalVerdict(
                $room,
                $validated['guilty_character_ids'],
                $validated['presented_evidence_ids'] ?? null,
            ),
        );

        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Assessment Failed',
                'message' => $result->errorMessage,
            ], 422);
        }

        return response()->json($result->value, 200);
    }
}
