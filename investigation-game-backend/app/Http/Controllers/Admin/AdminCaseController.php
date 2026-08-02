<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Cloudinary\Cloudinary;

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
            'max_strikes' => 'required|integer|min:1', 
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
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

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'cases'
            ]);
            $imageUrl = $upload['secure_url'];
        }

        $case = GameCase::create([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'], 
            'img_url' => $imageUrl,
        ]);

        return response()->json([
            'message' => 'Case created successfully.',
            'case' => $case,
            'image_url' => $imageUrl
        ], 201);
    }

    /**
     * Fetch all cases, their levels, and their evidence for admin dropdowns.
     */
    public function index(): JsonResponse
    {
        $cases = GameCase::with([
            'levels' => function ($query) {
                $query->select('id', 'case_id', 'title', 'order_index')->orderBy('order_index', 'asc');
            },
            'evidences:id,case_id,title,is_initial'
        ])
        ->select('id', 'title')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['cases' => $cases], 200);
    }

        public function destroy($id): JsonResponse
    {
        // Eager load everything associated with the case to harvest the media URLs
        $case = GameCase::with(['levels.evidences', 'levels.questions'])->findOrFail($id);

        // 1. Wipe Case Cover
        $this->deleteCloudinaryMedia($case->img_url);

        // 2. Wipe Level and Evidence Media
        foreach ($case->levels as $level) {
            $this->deleteCloudinaryMedia($level->img_url);

            foreach ($level->evidences as $evidence) {
                $this->deleteCloudinaryMedia($evidence->img_url);
                $this->deleteCloudinaryMedia($evidence->audio_url);
            }

            foreach ($level->questions as $question) {
                $this->deleteCloudinaryMedia($question->img_url);
            }
        }

        // 3. Wipe the database rows (handled automatically via SQLite cascadeOnDelete constraints)
        $case->delete();

        return response()->json(['message' => 'Case and all associated media completely wiped.'], 200);
    }

    /**
     * Regex helper to extract the public_id and trigger Cloudinary SDK deletion.
     */
    private function deleteCloudinaryMedia(?string $url): void
    {
        if (!$url) return;

        // Extracts everything after /upload/[version]/ up to the file extension
        if (preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            $publicId = $matches[1];
            
            // Cloudinary requires 'video' resource_type for audio files
            $resourceType = str_contains($url, '/video/') ? 'video' : 'image';

            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            try {
                $cloudinary->uploadApi()->destroy($publicId, ['resource_type' => $resourceType]);
            } catch (\Exception $e) {
                // Silently fail if the image is already missing from the cloud vault
            }
        }
    }
}
