<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use App\Enums\EvidenceType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rules\Enum;

class AdminEvidenceController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'paragraph' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240', // Max 10MB
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('evidence/images', 'public');
        }

        $audioPath = null;
        if ($request->hasFile('audio')) {
            $audioPath = $request->file('audio')->store('evidence/audio', 'public');
        }

        $evidence = Evidence::create([
            'level_id' => $validated['level_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'evidence_type' => $validated['evidence_type'],
            'paragraph' => $validated['paragraph'],
            'img_url' => $imagePath ? asset('storage/' . $imagePath) : null,
            'audio_url' => $audioPath ? asset('storage/' . $audioPath) : null,
        ]);

        return response()->json([
            'message' => 'Evidence added successfully.',
            'evidence' => $evidence
        ], 201);
    }
}