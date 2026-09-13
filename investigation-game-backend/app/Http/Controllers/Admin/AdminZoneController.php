<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminZoneController extends Controller
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

        $zone = Zone::create($validated);

        return response()->json([
            'message' => 'Zone created successfully.',
            'zone' => $zone
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $zone = Zone::findOrFail($id);
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order_index' => 'required|integer|min:1',
            'map_url'     => 'nullable|string',
            'coord_x'     => 'nullable|numeric|required_with:map_url',
            'coord_y'     => 'nullable|numeric|required_with:map_url',
        ]);
        
        $zone->update($validated);
        return response()->json(['message' => 'Zone updated.', 'zone' => $zone], 200);
    }

    public function destroy($id): JsonResponse
    {
        $zone = Zone::findOrFail($id);
        $zone->delete();
        return response()->json(['message' => 'Zone deleted.'], 200);
    }

    public function indexByCase($caseId): JsonResponse
    {
        $zones = Zone::with(['levels.questions.choices'])
            ->where('case_id', $caseId)
            ->orderBy('order_index', 'asc')
            ->get();

        return response()->json($zones, 200);
    }
}