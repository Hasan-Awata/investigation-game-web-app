<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\MediaService;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Standalone media endpoint for assets that are NOT the evidence's own
 * `img_url` / `audio_url` columns.
 *
 * Phase 1 moved every paper artefact onto the block model, and an `image` block
 * carries its own `props.url` inside `metadata.doc`. Those URLs are authored one
 * block at a time in the admin builder, long before the evidence row that will
 * eventually hold the document is saved -- so they cannot ride along with the
 * `store` / `update` form post. This endpoint is what the builder's image
 * inspector calls instead.
 *
 * Orphan policy is deliberately unchanged from the rest of the app: the
 * returned URL is persisted into the block on success, and a builder the author
 * abandons simply leaves an unreferenced file behind, exactly as an abandoned
 * evidence upload already does.
 */
class AdminMediaController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function storeBlockImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $url = $this->mediaService->store(
            $request->file('image'),
            $caseTitle,
            'Evidences/Blocks',
            $storeLocally
        );

        return response()->json([
            'message' => 'Block image uploaded successfully.',
            'url' => $url,
        ], 201);
    }
}
