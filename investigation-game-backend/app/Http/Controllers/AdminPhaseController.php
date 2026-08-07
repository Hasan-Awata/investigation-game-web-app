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
        ]);

        $phase = Phase::create($validated);

        return response()->json([
            'message' => 'Phase created successfully.',
            'phase' => $phase
        ], 201);
    }
}