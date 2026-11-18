<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use App\Services\InvestigationRequestService;
use App\Services\RoomSubmissionAttempts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvestigationRequestController extends Controller
{
    public function __construct(
        private readonly InvestigationRequestService $requestService,
    ) {}

    public function store(Request $request, GameRoom $room, RoomSubmissionAttempts $attempts): JsonResponse
    {
        // 1. Strict HTTP Validation
        $validated = $request->validate([
            'attempt_id' => ['sometimes', 'required', 'uuid'],
            'request_id' => ['required', 'integer'],
            'evidence_ids' => 'nullable|array|min:0',
            'evidence_ids.*' => 'integer|distinct|exists:evidences,id',
            'character_ids' => 'nullable|array|min:0',
            'character_ids.*' => 'integer|distinct|exists:characters,id',
        ]);

        $evidenceIds = $validated['evidence_ids'] ?? [];
        $characterIds = $validated['character_ids'] ?? [];

        if (! InvestigationRequest::hasMinimumItems(count($evidenceIds), count($characterIds))) {
            return response()->json([
                'error' => 'Request Denied',
                'message' => InvestigationRequest::MIN_ITEMS_MESSAGE,
            ], 422);
        }

        // 2. Execute Domain Logic
        $attemptId = $validated['attempt_id'] ?? null;
        unset($validated['attempt_id']);
        $result = $attempts->run(
            $room,
            $request->user()->id,
            'request',
            $attemptId,
            $validated,
            fn () => $this->requestService->processRequest($room, (int) $validated['request_id'], $evidenceIds, $characterIds),
        );

        // 3. Handle the Result
        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Request Denied',
                'message' => $result->errorMessage,
            ], 422);
        }

        return response()->json($result->value);
    }
}
