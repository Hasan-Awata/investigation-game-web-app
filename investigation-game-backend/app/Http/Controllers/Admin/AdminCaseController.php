<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\MediaService;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminCaseController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

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
            'tags' => 'nullable|string',
            'author_name' => 'required|string|max:100',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'is_published' => 'required|boolean',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);

        $imageUrl = $this->mediaService->store(
            $request->file('image'),
            $validated['title'],
            'Cover',
            $storeLocally
        );

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
            'is_published' => filter_var($request->is_published, FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json(['message' => 'Case created successfully.', 'case' => $case], 201);
    }

    public function index(): JsonResponse
    {
        $cases = GameCase::with([
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
            'is_published' => 'required|boolean',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);

        if ($request->hasFile('image')) {
            $this->mediaService->delete($case->getRawOriginal('img_url'));

            $case->img_url = $this->mediaService->store(
                $request->file('image'),
                $validated['title'],
                'Cover',
                $storeLocally
            );
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
            'is_published' => filter_var($request->is_published, FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json(['message' => 'Case updated successfully.', 'case' => $case], 200);
    }

    public function destroy($id): JsonResponse
    {
        $case = GameCase::with(['levels.questions', 'evidences'])->findOrFail($id);

        $this->mediaService->delete($case->getRawOriginal('img_url'));

        foreach ($case->levels as $level) {
            $this->mediaService->delete($level->getRawOriginal('img_url'));

            foreach ($level->evidences as $evidence) {
                $this->mediaService->delete($evidence->getRawOriginal('img_url'));
                $this->mediaService->delete($evidence->getRawOriginal('audio_url'));
            }

            foreach ($level->questions as $question) {
                $this->mediaService->delete($question->getRawOriginal('img_url'));
                $this->mediaService->delete($question->getRawOriginal('audio_url'));
            }
        }

        $case->delete();

        return response()->json(['message' => 'Case and all associated media completely wiped.'], 200);
    }
}