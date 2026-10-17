<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBlockImageRequest;
use App\Models\GameCase;
use App\Services\MediaService;
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

    public function storeBlockImage(StoreBlockImageRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $case = GameCase::find($validated['case_id']);
        $caseTitle = $case?->title ?? 'General';

        $url = $this->mediaService->store(
            $request->file('image'),
            $caseTitle,
            'Evidences/Blocks',
            $storeLocally,
            $case?->id
        );

        $normalizedUrl = $url && str_starts_with($url, '/')
            ? rtrim((string) config('app.url'), '/') . '/' . ltrim($url, '/')
            : $url;

        return response()->json([
            'message' => 'Block image uploaded successfully.',
            'url' => $normalizedUrl,
            'relative_path' => $url && str_starts_with($url, '/') ? $url : null,
        ], 201);
    }
}
