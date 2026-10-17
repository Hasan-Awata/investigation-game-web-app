<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreEvidenceRequest;
use App\Http\Requests\Admin\UpdateEvidenceRequest;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminEvidenceController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(StoreEvidenceRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $gameCase = GameCase::find($validated['case_id']);
        $caseTitle = $gameCase?->title ?? 'General';

        $imageUrl = $request->hasFile('image')
            ? $this->mediaService->store($request->file('image'), $caseTitle, 'Evidences', $storeLocally, $gameCase?->id)
            : ($request->filled('img_url') ? $request->input('img_url') : null);
        $audioUrl = $request->hasFile('audio')
            ? $this->mediaService->store($request->file('audio'), $caseTitle, 'Evidences', $storeLocally, $gameCase?->id)
            : ($request->filled('audio_url') ? $request->input('audio_url') : null);

        $evidence = DB::transaction(fn () => Evidence::create([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'metadata' => $this->normalizeMetadata($validated['metadata'] ?? null),
            'is_initial' => $request->boolean('is_initial'),
            'is_vital_for_conviction' => $request->boolean('is_vital_for_conviction'),
            'img_url' => $imageUrl,
            'audio_url' => $audioUrl,
        ]));

        return response()->json(['message' => 'Evidence added successfully.', 'evidence' => $evidence], 201);
    }

    public function update(UpdateEvidenceRequest $request, Evidence $evidence): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $gameCase = GameCase::find($validated['case_id']);
        $caseTitle = $gameCase?->title ?? 'General';
        $oldImage = $evidence->getRawOriginal('img_url');
        $oldAudio = $evidence->getRawOriginal('audio_url');
        $oldMetadata = $evidence->metadata;

        $updateData = [
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'is_initial' => $request->boolean('is_initial'),
            'is_vital_for_conviction' => $request->boolean('is_vital_for_conviction'),
        ];

        if ($request->exists('metadata')) {
            $updateData['metadata'] = $this->normalizeMetadata($request->input('metadata'));
        }

        $this->resolveMediaField($request, 'image', 'img_url', 'clear_img', $oldImage, $caseTitle, $gameCase?->id, $storeLocally, $updateData);
        $this->resolveMediaField($request, 'audio', 'audio_url', 'clear_audio', $oldAudio, $caseTitle, $gameCase?->id, $storeLocally, $updateData);

        DB::transaction(fn () => $evidence->update($updateData));

        foreach (['img_url' => $oldImage, 'audio_url' => $oldAudio] as $column => $oldUrl) {
            if (array_key_exists($column, $updateData) && $updateData[$column] !== $oldUrl) {
                $this->mediaService->delete($oldUrl);
            }
        }

        $newMetadata = $evidence->fresh()?->metadata;
        if (array_key_exists('metadata', $validated)) {
            $this->mediaService->cleanupOrphanedBlockImages($oldMetadata, $newMetadata);
        }

        return response()->json(['message' => 'Evidence updated successfully.', 'evidence' => $evidence->refresh()], 200);
    }

    public function destroy(Evidence $evidence): JsonResponse
    {
        $image = $evidence->getRawOriginal('img_url');
        $audio = $evidence->getRawOriginal('audio_url');
        $metadata = $evidence->metadata;

        DB::transaction(fn () => $evidence->delete());

        $this->mediaService->delete($image);
        $this->mediaService->delete($audio);
        $this->mediaService->cleanupOrphanedBlockImages($metadata, null);

        return response()->json(['message' => 'Evidence deleted.'], 200);
    }

    private function resolveMediaField(
        UpdateEvidenceRequest $request,
        string $fileField,
        string $urlField,
        string $clearField,
        ?string $oldUrl,
        string $caseTitle,
        ?int $caseId,
        bool $storeLocally,
        array &$updateData,
    ): void {
        if ($request->hasFile($fileField)) {
            $updateData[$urlField] = $this->mediaService->store($request->file($fileField), $caseTitle, 'Evidences', $storeLocally, $caseId);
            return;
        }

        if ($request->boolean($clearField) || ($request->exists($urlField) && $request->input($urlField) === null)) {
            $updateData[$urlField] = null;
            return;
        }

        if ($request->filled($urlField)) {
            $newUrl = (string) $request->input($urlField);
            if (!$this->mediaUrlsMatch($newUrl, $oldUrl)) {
                $updateData[$urlField] = $newUrl;
            }
        }
    }

    private function mediaUrlsMatch(string $first, ?string $second): bool
    {
        if ($second === null) {
            return false;
        }

        if ($first === $second) {
            return true;
        }

        $firstPath = parse_url($first, PHP_URL_PATH);
        $secondPath = parse_url($second, PHP_URL_PATH);
        $firstHost = parse_url($first, PHP_URL_HOST);
        $secondHost = parse_url($second, PHP_URL_HOST);

        if (is_string($firstHost) && is_string($secondHost) && strtolower($firstHost) !== strtolower($secondHost)) {
            return false;
        }

        $firstHasHost = is_string($firstHost);
        $secondHasHost = is_string($secondHost);
        if ($firstHasHost !== $secondHasHost) {
            $absoluteHost = $firstHasHost ? $firstHost : $secondHost;
            $configuredHost = parse_url((string) config('app.url'), PHP_URL_HOST);
            if (!is_string($configuredHost) || strtolower($absoluteHost) !== strtolower($configuredHost)) {
                return false;
            }
        }

        return is_string($firstPath) && is_string($secondPath) && $firstPath === $secondPath;
    }

    /** @return array<string, mixed>|null */
    private function normalizeMetadata(mixed $metadata): ?array
    {
        if (empty($metadata)) {
            return null;
        }

        if (is_string($metadata)) {
            $decoded = json_decode($metadata, true);
            return is_array($decoded) ? $decoded : null;
        }

        return is_array($metadata) ? $metadata : null;
    }
}
