<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
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
            'evidence_ids' => 'required|array|min:2',
            'evidence_ids.*' => 'integer|exists:evidences,id',
        ]);

        // 2. Execute Domain Logic
        $result = $this->requestService->processRequest($room, $validated['evidence_ids']);

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
            'unlocked_evidence' => $result->value['unlocked_evidence']
        ], 200);
    }
}