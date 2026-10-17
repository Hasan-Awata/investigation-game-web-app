<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportCaseBundleRequest;
use App\Http\Requests\Admin\StoreCaseRequest;
use App\Http\Requests\Admin\UpdateCaseRequest;
use App\Models\GameCase;
use App\Services\Case\CaseExportService;
use App\Services\Case\CaseImportService;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminCaseController extends Controller
{
    public function __construct(
        private readonly MediaService $mediaService,
        private readonly CaseImportService $caseImportService,
        private readonly CaseExportService $caseExportService,
    ) {}

    public function store(StoreCaseRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');

        $case = DB::transaction(fn () => GameCase::create([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'map_url' => $validated['map_url'] ?? null,
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'],
            'rating_stars' => $validated['rating_stars'],
            'age_rating' => $validated['age_rating'],
            'estimated_playtime' => $validated['estimated_playtime'],
            'difficulty' => $validated['difficulty'],
            'tags' => $this->parseTags($validated['tags'] ?? null),
            'author_name' => $validated['author_name'],
            'img_url' => null,
            'is_published' => $request->boolean('is_published'),
        ]));

        $imageUrl = $this->mediaService->store($request->file('image'), $case->title, 'Cover', $storeLocally, $case->id);
        if ($imageUrl !== null) {
            DB::transaction(fn () => $case->update(['img_url' => $imageUrl]));
        }

        return response()->json(['message' => 'Case created successfully.', 'case' => $case], 201);
    }

    public function index(): JsonResponse
    {
        $cases = GameCase::with([
            'zones.levels.questions.choices',
            'evidences',
            'characters',
            'investigationRequests.requiredEvidences',
            'investigationRequests.requiredCharacters',
        ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['cases' => $cases], 200);
    }

    public function update(UpdateCaseRequest $request, GameCase $case): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');

        $oldImage = $case->getRawOriginal('img_url');
        $newImage = $request->hasFile('image')
            ? $this->mediaService->store($request->file('image'), $validated['title'], 'Cover', $storeLocally, $case->id)
            : null;

        $updateData = [
            'title' => $validated['title'],
            'story' => $validated['story'],
            'map_url' => $validated['map_url'] ?? null,
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'],
            'rating_stars' => $validated['rating_stars'],
            'age_rating' => $validated['age_rating'],
            'estimated_playtime' => $validated['estimated_playtime'],
            'difficulty' => $validated['difficulty'],
            'tags' => $this->parseTags($validated['tags'] ?? null),
            'author_name' => $validated['author_name'],
            'is_published' => $request->boolean('is_published'),
        ];

        if ($newImage !== null) {
            $updateData['img_url'] = $newImage;
        }

        DB::transaction(fn () => $case->update($updateData));

        if ($newImage !== null && $newImage !== $oldImage) {
            $this->mediaService->delete($oldImage);
        }

        return response()->json(['message' => 'Case updated successfully.', 'case' => $case], 200);
    }

    public function destroy(GameCase $case): JsonResponse
    {
        $case->load(['levels.questions', 'evidences', 'characters']);

        $cover = $case->getRawOriginal('img_url');
        $evidenceMedia = [];
        $evidenceMetadata = [];
        $levelMedia = [];
        $questionMedia = [];
        $characterMedia = [];

        foreach ($case->evidences as $evidence) {
            $evidenceMedia[] = $evidence->getRawOriginal('img_url');
            $evidenceMedia[] = $evidence->getRawOriginal('audio_url');
            $evidenceMetadata[] = $evidence->metadata;
        }

        foreach ($case->levels as $level) {
            $levelMedia[] = $level->getRawOriginal('img_url');

            foreach ($level->questions as $question) {
                $questionMedia[] = $question->getRawOriginal('img_url');
                $questionMedia[] = $question->getRawOriginal('audio_url');
            }
        }

        foreach ($case->characters as $character) {
            $characterMedia[] = $character->getRawOriginal('img_url');
        }

        // Database cascadeOnDelete handles the actual row removals.
        DB::transaction(fn () => $case->delete());

        foreach (array_merge([$cover], $evidenceMedia, $levelMedia, $questionMedia, $characterMedia) as $url) {
            $this->mediaService->delete($url);
        }

        foreach ($evidenceMetadata as $metadata) {
            $this->mediaService->cleanupOrphanedBlockImages($metadata, null);
        }

        return response()->json(['message' => 'Case and all associated media completely wiped.'], 200);
    }

    /**
     * Import a full case bundle (`case-bundle.zip`) including media.
     *
     * Delegates the multi-pass ref resolution and media ingestion to
     * {@see CaseImportService}. Add-only: duplicate titles are rejected with a
     * clean 422 by the service.
     */
    public function import(ImportCaseBundleRequest $request): JsonResponse
    {
        $case = $this->caseImportService->import(
            $request->file('file'),
            $request->boolean('store_locally', true),
        );

        return response()->json([
            'message' => 'Case bundle imported successfully.',
            'case_id' => $case->id,
        ], 201);
    }

    /**
     * Export a single case (graph + media) as a downloadable ZIP bundle.
     */
    public function export(GameCase $case): BinaryFileResponse
    {
        $path = $this->caseExportService->export($case);

        $filename = (Str::slug($case->title) ?: 'case').'-case-bundle.zip';

        return response()
            ->download($path, $filename, ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    /**
     * @return array<int, string>
     */
    private function parseTags(?string $tags): array
    {
        if ($tags === null || trim($tags) === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $tags)), fn ($tag) => $tag !== ''));
    }
}
