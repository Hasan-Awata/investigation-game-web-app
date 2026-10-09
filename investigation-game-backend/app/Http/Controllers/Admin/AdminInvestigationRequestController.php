<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvestigationRequest;
use App\Enums\InvestigationRequestType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Support\Facades\DB;

class AdminInvestigationRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'request_type' => ['required', new Enum(InvestigationRequestType::class)],
            'unlocks_evidence_id' => 'nullable|exists:evidences,id',
            'unlocks_level_id' => 'nullable|exists:levels,id',
            'required_evidence_ids' => 'nullable|array',
            'required_evidence_ids.*' => 'exists:evidences,id',
            'required_character_ids' => 'nullable|array',
            'required_character_ids.*' => 'exists:characters,id',
        ]);

        if ($this->totalRequired($validated) < 2) {
            return $this->tooFewItemsResponse();
        }

        return DB::transaction(function () use ($validated) {
            $investigationRequest = InvestigationRequest::create([
                'case_id' => $validated['case_id'],
                'request_type' => $validated['request_type'],
                'unlocks_evidence_id' => $validated['unlocks_evidence_id'] ?? null,
                'unlocks_level_id' => $validated['unlocks_level_id'] ?? null,
            ]);

            // Automatically populate the pivot tables (evidences + characters)
            $investigationRequest->requiredEvidences()->sync($validated['required_evidence_ids'] ?? []);
            $investigationRequest->requiredCharacters()->sync($validated['required_character_ids'] ?? []);

            return response()->json([
                'message' => 'Investigation request created successfully.',
                'investigation_request' => $investigationRequest->load(['requiredEvidences', 'requiredCharacters'])
            ], 201);
        });
    }

    public function update(Request $request, $id): JsonResponse
    {
        $investigationRequest = InvestigationRequest::findOrFail($id);

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'request_type' => ['required', new Enum(InvestigationRequestType::class)],
            'unlocks_evidence_id' => 'nullable|exists:evidences,id',
            'unlocks_level_id' => 'nullable|exists:levels,id',
            'required_evidence_ids' => 'nullable|array',
            'required_evidence_ids.*' => 'exists:evidences,id',
            'required_character_ids' => 'nullable|array',
            'required_character_ids.*' => 'exists:characters,id',
        ]);

        if ($this->totalRequired($validated) < 2) {
            return $this->tooFewItemsResponse();
        }

        return DB::transaction(function () use ($investigationRequest, $validated) {
            $investigationRequest->update([
                'case_id' => $validated['case_id'],
                'request_type' => $validated['request_type'],
                'unlocks_evidence_id' => $validated['unlocks_evidence_id'] ?? null,
                'unlocks_level_id' => $validated['unlocks_level_id'] ?? null,
            ]);

            // Sync automatically updates the pivot tables
            $investigationRequest->requiredEvidences()->sync($validated['required_evidence_ids'] ?? []);
            $investigationRequest->requiredCharacters()->sync($validated['required_character_ids'] ?? []);

            return response()->json([
                'message' => 'Investigation request updated.',
                'investigation_request' => $investigationRequest->load(['requiredEvidences', 'requiredCharacters'])
            ], 200);
        });
    }

    private function totalRequired(array $validated): int
    {
        return count($validated['required_evidence_ids'] ?? [])
            + count($validated['required_character_ids'] ?? []);
    }

    private function tooFewItemsResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'A request must require at least two items (evidences and/or characters).',
            'errors' => [
                'required_evidence_ids' => ['A request must require at least two items in total.'],
            ],
        ], 422);
    }

    public function destroy($id): JsonResponse
    {
        $investigationRequest = InvestigationRequest::findOrFail($id);
        
        // Pivot records in `investigation_request_items` delete automatically due to cascadeOnDelete constraints
        $investigationRequest->delete();

        return response()->json(['message' => 'Investigation request deleted.'], 200);
    }
}