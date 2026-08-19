<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Traits\HandlesMedia;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Enums\EvidenceType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rules\Enum;

class AdminEvidenceController extends Controller
{
    use HandlesMedia; 

public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id', 
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'sub_type' => 'nullable|string',
            'metadata' => 'nullable|string', // Validated as a string, decoded later
            'is_initial' => 'required|boolean', 
            'is_vital_for_conviction' => 'required|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $imageUrl = $this->storeMedia($request->file('image'), $caseTitle, 'Evidences', $storeLocally);
        $audioUrl = $this->storeMedia($request->file('audio'), $caseTitle, 'Evidences', $storeLocally);

        // Safely decode the metadata JSON string from FormData
        $metadataPayload = null;
        if (!empty($validated['metadata'])) {
            $metadataPayload = json_decode($validated['metadata'], true);
        }

        $evidence = Evidence::create([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'sub_type' => $validated['sub_type'] ?? null,
            'metadata' => $metadataPayload,
            'is_initial' => $validated['is_initial'],
            'is_vital_for_conviction' => $validated['is_vital_for_conviction'],
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
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'sub_type' => 'nullable|string',
            'metadata' => 'nullable|string',
            'is_initial' => 'required|boolean', 
            'is_vital_for_conviction' => 'required|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $metadataPayload = null;
        if (!empty($validated['metadata'])) {
            $metadataPayload = json_decode($validated['metadata'], true);
        }

        $updateData = [
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $validated['evidence_type'],
            'sub_type' => $validated['sub_type'] ?? null,
            'metadata' => $metadataPayload,
            'is_initial' => $validated['is_initial'],
            'is_vital_for_conviction' => $validated['is_vital_for_conviction'],
        ];

        if ($request->hasFile('image')) {
            // Wipe old image (local or cloud)
            $this->deleteMedia($evidence->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->storeMedia($request->file('image'), $caseTitle, 'Evidences', $storeLocally);
        }

        if ($request->hasFile('audio')) {
            // Wipe old audio track (local or cloud)
            $this->deleteMedia($evidence->getRawOriginal('audio_url'));
            $updateData['audio_url'] = $this->storeMedia($request->file('audio'), $caseTitle, 'Evidences', $storeLocally);
        }

        $evidence->update($updateData);

        return response()->json(['message' => 'Evidence updated successfully.', 'evidence' => $evidence], 200);
    }

    public function destroy($id): JsonResponse
    {
        $evidence = Evidence::findOrFail($id);
        
        // Wipe associated media safely using the trait helper
        $this->deleteMedia($evidence->getRawOriginal('img_url'));
        $this->deleteMedia($evidence->getRawOriginal('audio_url'));
        
        $evidence->delete();
        
        return response()->json(['message' => 'Evidence deleted.'], 200);
    }
}