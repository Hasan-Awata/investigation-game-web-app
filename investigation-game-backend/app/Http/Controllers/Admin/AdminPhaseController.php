<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Phase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminPhaseController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order_index' => 'required|integer|min:1',
            'map_url'     => 'nullable|string',
            'coord_x'     => 'nullable|numeric|required_with:map_url',
            'coord_y'     => 'nullable|numeric|required_with:map_url',
        ]);

        $phase = Phase::create($validated);

        return response()->json([
            'message' => 'Phase created successfully.',
            'phase' => $phase
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $phase = Phase::findOrFail($id);
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order_index' => 'required|integer|min:1',
            'map_url'     => 'nullable|string',
            'coord_x'     => 'nullable|numeric|required_with:map_url',
            'coord_y'     => 'nullable|numeric|required_with:map_url',
        ]);
        $phase->update($validated);
        return response()->json(['message' => 'Phase updated.', 'phase' => $phase], 200);
    }

    public function destroy($id): JsonResponse
    {
        $phase = Phase::findOrFail($id);
        $phase->delete();
        return response()->json(['message' => 'Phase deleted.'], 200);
    }

    public function indexByCase($caseId): \Illuminate\Http\JsonResponse
    {
        $phases = Phase::where('case_id', $caseId)
            ->orderBy('order_index', 'asc')
            ->get();
            
        return response()->json($phases, 200);
    }
}