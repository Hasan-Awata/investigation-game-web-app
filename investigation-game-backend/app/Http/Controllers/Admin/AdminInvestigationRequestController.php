<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreInvestigationRequestRequest;
use App\Http\Requests\Admin\UpdateInvestigationRequestRequest;
use App\Models\InvestigationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminInvestigationRequestController extends Controller
{
    public function store(StoreInvestigationRequestRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $investigationRequest = DB::transaction(function () use ($validated) {
            $investigationRequest = InvestigationRequest::create([
                'case_id' => $validated['case_id'],
                'request_type' => $validated['request_type'],
                'unlocks_evidence_id' => $validated['unlocks_evidence_id'] ?? null,
                'unlocks_level_id' => $validated['unlocks_level_id'] ?? null,
            ]);

            $investigationRequest->requiredEvidences()->sync($validated['required_evidence_ids'] ?? []);
            $investigationRequest->requiredCharacters()->sync($validated['required_character_ids'] ?? []);

            return $investigationRequest;
        });

        return response()->json([
            'message' => 'Investigation request created successfully.',
            'investigation_request' => $investigationRequest->load(['requiredEvidences', 'requiredCharacters']),
        ], 201);
    }

    public function update(UpdateInvestigationRequestRequest $request, InvestigationRequest $investigationRequest): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($investigationRequest, $validated) {
            $investigationRequest->update([
                'case_id' => $validated['case_id'],
                'request_type' => $validated['request_type'],
                'unlocks_evidence_id' => $validated['unlocks_evidence_id'] ?? null,
                'unlocks_level_id' => $validated['unlocks_level_id'] ?? null,
            ]);

            $investigationRequest->requiredEvidences()->sync($validated['required_evidence_ids'] ?? []);
            $investigationRequest->requiredCharacters()->sync($validated['required_character_ids'] ?? []);
        });

        return response()->json([
            'message' => 'Investigation request updated.',
            'investigation_request' => $investigationRequest->load(['requiredEvidences', 'requiredCharacters']),
        ], 200);
    }

    public function destroy(InvestigationRequest $investigationRequest): JsonResponse
    {
        // Pivot records in `investigation_request_items`/`_characters` delete
        // automatically due to cascadeOnDelete constraints.
        DB::transaction(fn () => $investigationRequest->delete());

        return response()->json(['message' => 'Investigation request deleted.'], 200);
    }
}
