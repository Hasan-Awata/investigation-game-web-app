<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class AdminCaseController extends Controller
{
    /**
     * Store a newly created case with an optional cover image.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'story' => 'required|string',
            'min_player_XP' => 'required|integer|min:0',
            'XP_on_solve' => 'required|integer|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096', // Max 4MB
        ]);

        // Note: We don't store the image path in the `cases` table currently, 
        // but you can save it to the filesystem for the frontend to consume.
        $imagePath = null;
        if ($request->hasFile('image')) {
            // Stores the file in storage/app/public/cases and returns the path
            $imagePath = $request->file('image')->store('cases', 'public');
        }

        $case = GameCase::create([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
        ]);

        return response()->json([
            'message' => 'Case created successfully.',
            'case' => $case,
            'image_url' => $imagePath ? asset('storage/' . $imagePath) : null
        ], 201);
    }

    /**
     * Fetch all cases and their associated levels for admin dropdowns.
     */
    public function index(): JsonResponse
    {
        $cases = GameCase::with(['levels' => function ($query) {
            $query->select('id', 'case_id', 'title', 'order_index')->orderBy('order_index', 'asc');
        }])
        ->select('id', 'title')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'cases' => $cases
        ], 200);
    }

}
