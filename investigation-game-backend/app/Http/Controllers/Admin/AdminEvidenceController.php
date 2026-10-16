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
        $caseTitle = GameCase::whereKey($validated['case_id'])->value('title') ?? 'General';

        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, 'Evidences', $storeLocally);
        $audioUrl = $this->mediaService->store($request->file('audio'), $caseTitle, 'Evidences', $storeLocally);

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
        $caseTitle = GameCase::whereKey($validated['case_id'])->value('title') ?? 'General';

        $oldImage = $evidence->getRawOriginal('img_url');
        $oldAudio = $evidence->getRawOriginal('audio_url');

        $newImage = $request->hasFile('image')
            ? $this->mediaService->store($request->file('image'), $caseTitle, 'Evidences', $storeLocally)
            : null;
        $newAudio = $request->hasFile('audio')
            ? $this->mediaService->store($request->file('audio'), $caseTitle, 'Evidences', $storeLocally)
            : null;

        $updateData = [
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'metadata' => $this->normalizeMetadata($validated['metadata'] ?? null),
            'is_initial' => $request->boolean('is_initial'),
            'is_vital_for_conviction' => $request->boolean('is_vital_for_conviction'),
        ];

        if ($newImage !== null) {
            $updateData['img_url'] = $newImage;
        }

        if ($newAudio !== null) {
            $updateData['audio_url'] = $newAudio;
        }

        DB::transaction(fn () => $evidence->update($updateData));

        if ($newImage !== null && $newImage !== $oldImage) {
            $this->mediaService->delete($oldImage);
        }

        if ($newAudio !== null && $newAudio !== $oldAudio) {
            $this->mediaService->delete($oldAudio);
        }

        return response()->json(['message' => 'Evidence updated successfully.', 'evidence' => $evidence], 200);
    }

    public function destroy(Evidence $evidence): JsonResponse
    {
        $image = $evidence->getRawOriginal('img_url');
        $audio = $evidence->getRawOriginal('audio_url');

        DB::transaction(fn () => $evidence->delete());

        $this->mediaService->delete($image);
        $this->mediaService->delete($audio);

        return response()->json(['message' => 'Evidence deleted.'], 200);
    }

    /**
     * The evidence metadata may arrive as a JSON string (multipart form) or as
     * an already-decoded array (JSON body).
     *
     * @return array<string, mixed>|null
     */
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
