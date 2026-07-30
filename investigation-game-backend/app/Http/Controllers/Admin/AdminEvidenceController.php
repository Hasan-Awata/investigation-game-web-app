<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use App\Enums\EvidenceType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rules\Enum;
use Cloudinary\Cloudinary; 

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
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240',
        ]);

        // 1. Manually configure the Cloudinary instance
        $cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key'    => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => [
                'secure' => true
            ]
        ]);

        // 2. Upload Image
        $imageUrl = null;
        if ($request->hasFile('image')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'evidence/images'
            ]);
            $imageUrl = $upload['secure_url']; 
        }

        // 3. Upload Audio
        $audioUrl = null;
        if ($request->hasFile('audio')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('audio')->getRealPath(), [
                'folder' => 'evidence/audio',
                'resource_type' => 'video' // Required for audio files
            ]);
            $audioUrl = $upload['secure_url'];
        }

        $evidence = Evidence::create([
            'level_id' => $validated['level_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'paragraph' => $validated['paragraph'] ?? null,
            'img_url' => $imageUrl,
            'audio_url' => $audioUrl,
        ]);

        return response()->json([
            'message' => 'Evidence added successfully.',
            'evidence' => $evidence
        ], 201);
    }
}