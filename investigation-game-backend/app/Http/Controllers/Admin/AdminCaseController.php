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
            'rating_stars' => 'required|numeric|min:0|max:5',
            'age_rating' => 'required|string|max:50',
            'estimated_playtime' => 'required|string|max:100',
            'difficulty' => 'required|string|max:50',
            'tags' => 'nullable|string', // We will accept a comma-separated string from the frontend
            'author_name' => 'required|string|max:100',
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

        // Convert the comma-separated tags string into a proper array
        $tagsArray = $request->filled('tags') 
            ? array_map('trim', explode(',', $validated['tags'])) 
            : [];

        $case = GameCase::create([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'], 
            'rating_stars' => $validated['rating_stars'],
            'age_rating' => $validated['age_rating'],
            'estimated_playtime' => $validated['estimated_playtime'],
            'difficulty' => $validated['difficulty'],
            'tags' => $tagsArray,
            'author_name' => $validated['author_name'],
            'img_url' => $imageUrl,
        ]);

        return response()->json(['message' => 'Case created successfully.', 'case' => $case], 201);
    }

    /**
     * Fetch all cases, their levels, and their evidence for admin dropdowns.
     */
    public function index(): JsonResponse
    {
        // Removed the ->select('id', 'title') restrictions so the React forms get ALL the data
        $cases = GameCase::with([
            'phases.levels.questions.choices',
            'evidences',
            'suspects',
            'victims',
            'investigationRequests.requiredEvidences' 
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['cases' => $cases], 200);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $case = GameCase::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'story' => 'required|string',
            'min_player_XP' => 'required|integer|min:0',
            'XP_on_solve' => 'required|integer|min:0',
            'max_strikes' => 'required|integer|min:1', 
            'rating_stars' => 'required|numeric|min:0|max:5',
            'age_rating' => 'required|string|max:50',
            'estimated_playtime' => 'required|string|max:100',
            'difficulty' => 'required|string|max:50',
            'tags' => 'nullable|string',
            'author_name' => 'required|string|max:100',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        if ($request->hasFile('image')) {
            // Wipe the old cover image to free up vault space
            $this->deleteCloudinaryMedia($case->img_url); 
            
            $cloudinary = new \Cloudinary\Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'cases'
            ]);
            $case->img_url = $upload['secure_url']; // Update model instance directly
        }

        $case->update([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'], 
            'rating_stars' => $validated['rating_stars'],
            'age_rating' => $validated['age_rating'],
            'estimated_playtime' => $validated['estimated_playtime'],
            'difficulty' => $validated['difficulty'],
            'tags' => $request->filled('tags') ? array_map('trim', explode(',', $validated['tags'])) : [],
            'author_name' => $validated['author_name'],
        ]);

        return response()->json(['message' => 'Case updated successfully.', 'case' => $case], 200);
    }

        public function destroy($id): JsonResponse
    {
        // Eager load everything associated with the case to harvest the media URLs
        $case = GameCase::with(['levels.questions', 'evidences'])->findOrFail($id);

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
