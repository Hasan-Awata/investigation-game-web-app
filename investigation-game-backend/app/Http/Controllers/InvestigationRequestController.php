<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use App\Services\InvestigationRequestService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvestigationRequestController extends Controller
{
    public function __construct(
        private readonly InvestigationRequestService $requestService
    ) {}

    public function store(Request $request, GameRoom $room): JsonResponse
    {
        // 1. Strict HTTP Validation
        $validated = $request->validate([
            'evidence_ids' => 'nullable|array|min:0',
            'evidence_ids.*' => 'integer|exists:evidences,id',
            'character_ids' => 'nullable|array|min:0',
            'character_ids.*' => 'integer|exists:characters,id',
        ]);

        $evidenceIds = $validated['evidence_ids'] ?? [];
        $characterIds = $validated['character_ids'] ?? [];

        if (!InvestigationRequest::hasMinimumItems(count($evidenceIds), count($characterIds))) {
            return response()->json([
                'error' => 'Request Denied',
                'message' => InvestigationRequest::MIN_ITEMS_MESSAGE
            ], 422);
        }

        // 2. Execute Domain Logic
        $result = $this->requestService->processRequest($room, $evidenceIds, $characterIds);

        // 3. Handle the Result
        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Request Denied',
                'message' => $result->errorMessage
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => $result->value['message'],
            'unlocked_evidence' => $result->value['unlocked_evidence'],
            'unlocked_levels' => $result->value['unlocked_levels'] 
        ], 200);
    }
}