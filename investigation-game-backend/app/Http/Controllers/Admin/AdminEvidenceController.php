<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreEvidenceRequest;
use App\Http\Requests\Admin\UpdateEvidenceRequest;
use App\Services\MediaService;
use App\Models\Evidence;
use App\Models\GameCase;
use Illuminate\Http\JsonResponse;

class AdminEvidenceController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(StoreEvidenceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, 'Evidences', $storeLocally);
        $audioUrl = $this->mediaService->store($request->file('audio'), $caseTitle, 'Evidences', $storeLocally);

        $metadataPayload = null;
        if (!empty($validated['metadata'])) {
            $metadataPayload = is_string($validated['metadata'])
                ? json_decode($validated['metadata'], true)
                : $validated['metadata'];
        }

        $evidence = Evidence::create([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'metadata' => $metadataPayload,
            'is_initial' => $validated['is_initial'],
            'is_vital_for_conviction' => $validated['is_vital_for_conviction'],
            'img_url' => $imageUrl,
            'audio_url' => $audioUrl,
        ]);

        return response()->json(['message' => 'Evidence added successfully.', 'evidence' => $evidence], 201);
    }

    public function update(UpdateEvidenceRequest $request, $id): JsonResponse
    {
        $evidence = Evidence::findOrFail($id);

        $validated = $request->validated();

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $metadataPayload = null;
        if (!empty($validated['metadata'])) {
            $metadataPayload = is_string($validated['metadata'])
                ? json_decode($validated['metadata'], true)
                : $validated['metadata'];
        }

        $updateData = [
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'metadata' => $metadataPayload,
            'is_initial' => $validated['is_initial'],
            'is_vital_for_conviction' => $validated['is_vital_for_conviction'],
        ];

        if ($request->hasFile('image')) {
            $this->mediaService->delete($evidence->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->mediaService->store($request->file('image'), $caseTitle, 'Evidences', $storeLocally);
        }

        if ($request->hasFile('audio')) {
            $this->mediaService->delete($evidence->getRawOriginal('audio_url'));
            $updateData['audio_url'] = $this->mediaService->store($request->file('audio'), $caseTitle, 'Evidences', $storeLocally);
        }

        $evidence->update($updateData);

        return response()->json(['message' => 'Evidence updated successfully.', 'evidence' => $evidence], 200);
    }

    public function destroy($id): JsonResponse
    {
        $evidence = Evidence::findOrFail($id);

        $this->mediaService->delete($evidence->getRawOriginal('img_url'));
        $this->mediaService->delete($evidence->getRawOriginal('audio_url'));

        $evidence->delete();

        return response()->json(['message' => 'Evidence deleted.'], 200);
    }
}