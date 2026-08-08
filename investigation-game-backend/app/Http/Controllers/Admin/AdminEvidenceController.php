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
            'case_id' => 'required|exists:cases,id', 
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'paragraph' => 'nullable|string',
            'is_initial' => 'required|boolean', 
            'is_vital_for_conviction' => 'required|boolean', // Unified naming
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240',
        ]);

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

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'evidence/images'
            ]);
            $imageUrl = $upload['secure_url']; 
        }

        $audioUrl = null;
        if ($request->hasFile('audio')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('audio')->getRealPath(), [
                'folder' => 'evidence/audio',
                'resource_type' => 'video'
            ]);
            $audioUrl = $upload['secure_url'];
        }

        $evidence = Evidence::create([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'paragraph' => $validated['paragraph'] ?? null,
            'is_initial' => $validated['is_initial'],
            'is_vital_for_conviction' => $validated['is_vital_for_conviction'], // Unified naming
            'img_url' => $imageUrl,
            'audio_url' => $audioUrl,
        ]);

        return response()->json(['message' => 'Evidence added successfully.', 'evidence' => $evidence], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $evidence = Evidence::findOrFail($id);
        
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id', 
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'evidence_type' => ['required', new \Illuminate\Validation\Rules\Enum(\App\Enums\EvidenceType::class)],
            'paragraph' => 'nullable|string',
            'is_initial' => 'required|boolean', 
            'is_vital_for_conviction' => 'required|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240',
        ]);

        if ($request->hasFile('image') || $request->hasFile('audio')) {
            $cloudinary = new \Cloudinary\Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            if ($request->hasFile('image')) {
                // Wipe old image if a new one is uploaded
                $this->deleteCloudinaryMedia($evidence->img_url);
                
                $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                    'folder' => 'evidence/images'
                ]);
                $validated['img_url'] = $upload['secure_url']; 
            }

            if ($request->hasFile('audio')) {
                // Wipe old audio track if a new one is uploaded
                $this->deleteCloudinaryMedia($evidence->audio_url);

                $upload = $cloudinary->uploadApi()->upload($request->file('audio')->getRealPath(), [
                    'folder' => 'evidence/audio',
                    'resource_type' => 'video' // Cloudinary requires 'video' for audio files
                ]);
                $validated['audio_url'] = $upload['secure_url'];
            }
        }

        $evidence->update($validated);

        return response()->json(['message' => 'Evidence updated successfully.', 'evidence' => $evidence], 200);
    }

    public function destroy($id): JsonResponse
    {
        $evidence = Evidence::findOrFail($id);
        $this->deleteCloudinaryMedia($evidence->img_url);
        $this->deleteCloudinaryMedia($evidence->audio_url);
        $evidence->delete();
        return response()->json(['message' => 'Evidence deleted.'], 200);
    }

    private function deleteCloudinaryMedia(?string $url): void
    {
        if (!$url) return;
        if (preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            $cloudinary = new \Cloudinary\Cloudinary(['cloud' => ['cloud_name' => env('CLOUDINARY_CLOUD_NAME'), 'api_key' => env('CLOUDINARY_API_KEY'), 'api_secret' => env('CLOUDINARY_API_SECRET')], 'url' => ['secure' => true]]);
            try { $cloudinary->uploadApi()->destroy($matches[1], ['resource_type' => str_contains($url, '/video/') ? 'video' : 'image']); } catch (\Exception $e) {}
        }
    }
}