<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreZoneRequest;
use App\Http\Requests\Admin\UpdateZoneRequest;
use App\Models\GameCase;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminZoneController extends Controller
{
    public function store(StoreZoneRequest $request): JsonResponse
    {
        $zone = DB::transaction(fn () => Zone::create($request->validated()));

        return response()->json([
            'message' => 'Zone created successfully.',
            'zone' => $zone,
        ], 201);
    }

    public function update(UpdateZoneRequest $request, Zone $zone): JsonResponse
    {
        DB::transaction(fn () => $zone->update($request->validated()));

        return response()->json(['message' => 'Zone updated.', 'zone' => $zone], 200);
    }

    public function destroy(Zone $zone): JsonResponse
    {
        DB::transaction(fn () => $zone->delete());

        return response()->json(['message' => 'Zone deleted.'], 200);
    }

    public function indexByCase(GameCase $case): JsonResponse
    {
        $zones = Zone::with(['levels.questions.choices'])
            ->where('case_id', $case->id)
            ->orderBy('order_index', 'asc')
            ->get();

        return response()->json($zones, 200);
    }
}
