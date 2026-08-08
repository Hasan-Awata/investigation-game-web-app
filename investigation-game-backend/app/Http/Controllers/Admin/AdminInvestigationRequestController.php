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
            'unlocks_evidence_id' => 'required|exists:evidences,id',
            'required_evidence_ids' => 'required|array|min:2',
            'required_evidence_ids.*' => 'exists:evidences,id',
        ]);

        // Wrap in a transaction to ensure both the parent record and pivot table sync cleanly
        return DB::transaction(function () use ($validated) {
            $investigationRequest = InvestigationRequest::create([
                'case_id' => $validated['case_id'],
                'request_type' => $validated['request_type'],
                'unlocks_evidence_id' => $validated['unlocks_evidence_id'],
            ]);

            // Automatically populate the investigation_request_items pivot table
            $investigationRequest->requiredEvidences()->sync($validated['required_evidence_ids']);

            return response()->json([
                'message' => 'Investigation request created successfully.',
                'investigation_request' => $investigationRequest->load('requiredEvidences')
            ], 201);
        });
    }

    public function update(Request $request, $id): JsonResponse
    {
        $investigationRequest = InvestigationRequest::findOrFail($id);

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'request_type' => ['required', new Enum(InvestigationRequestType::class)],
            'unlocks_evidence_id' => 'required|exists:evidences,id',
            'required_evidence_ids' => 'required|array|min:2',
            'required_evidence_ids.*' => 'exists:evidences,id',
        ]);

        return DB::transaction(function () use ($investigationRequest, $validated) {
            $investigationRequest->update([
                'case_id' => $validated['case_id'],
                'request_type' => $validated['request_type'],
                'unlocks_evidence_id' => $validated['unlocks_evidence_id'],
            ]);

            // Sync automatically updates the pivot table (investigation_request_items)
            $investigationRequest->requiredEvidences()->sync($validated['required_evidence_ids']);

            return response()->json([
                'message' => 'Investigation request updated.',
                'investigation_request' => $investigationRequest->load('requiredEvidences')
            ], 200);
        });
    }

    public function destroy($id): JsonResponse
    {
        $investigationRequest = InvestigationRequest::findOrFail($id);
        // Pivot records delete automatically due to cascade constraints in migration
        $investigationRequest->delete();

        return response()->json(['message' => 'Investigation request deleted.'], 200);
    }
}