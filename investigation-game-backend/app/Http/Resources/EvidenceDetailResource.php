<?php

namespace App\Http\Resources;

use App\Enums\AssetKind;
use App\Enums\PaperFinish;
use App\Models\Evidence;
use App\Services\Evidence\SignatureCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The full evidence document, returned only after the room has inspected it.
 *
 * This is the single place the client receives content_payload, so the payload
 * shape is guaranteed to match the stored viewer_strategy rather than the
 * client inferring it from the type.
 *
 * @mixin Evidence
 */
class EvidenceDetailResource extends JsonResource
{
    /**
     * Keys in this resource are part of the contract, not list offsets.
     *
     * The resource pipeline calls array_values() on any array whose keys are
     * all numeric, which silently turns an id-keyed map into a positional one.
     * Setting this keeps every key intact at every level, so an id-keyed map
     * cannot be re-indexed by accident now or after a later edit.
     *
     * @var bool
     */
    protected $preserveKeys = true;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $assets = $this->resource->assets;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'evidence_type' => $this->evidence_type?->value,
            'viewer_strategy' => $this->viewer_strategy?->value,
            'paper_finish' => $this->paper_finish instanceof PaperFinish
                ? $this->paper_finish->value
                : null,
            'is_vital_for_conviction' => (bool) $this->is_vital_for_conviction,
            'content_payload' => $this->contentPayload(),
            'assets' => $assets->map(fn ($asset): array => [
                'kind' => $asset->kind?->value,
                'url' => $asset->url(),
                'mime' => $asset->mime,
                'bytes' => $asset->bytes,
                'meta' => $asset->meta,
            ])->values()->all(),
            'media' => $this->media(),

            // A signature block stores an id from the catalog, not a filename.
            // Without this lookup a player would have to rebuild the id to
            // filename mapping locally, which is the fragile assumption the
            // catalog exists to remove.
            'signature_paths' => $this->signaturePaths(),
        ];
    }

    /**
     * Normalised on read as well as on write.
     *
     * An empty payload means the same thing as no payload for every strategy,
     * so it is reported as null. Rows written before the validator returned
     * null stored an empty array, and normalising here keeps those documents on
     * the documented contract without needing a data migration to fix them.
     *
     * @return array<string, mixed>|null
     */
    private function contentPayload(): ?array
    {
        $payload = $this->content_payload;

        return $payload === [] ? null : $payload;
    }

    /**
     * @return object An id-keyed map, deliberately not a PHP array.
     */
    private function signaturePaths(): \stdClass
    {
        $paths = [];

        foreach (app(SignatureCatalog::class)->all() as $signature) {
            $paths[(string) $signature['id']] = $signature['path'];
        }

        // Cast to an object so the id-keyed shape is the declared return type
        // rather than an array that only happens to encode correctly. This is
        // the second of two independent guards: $preserveKeys above stops the
        // pipeline re-indexing any numeric-keyed array, and this cast keeps
        // this field correct even if that flag is ever dropped.
        return (object) $paths;
    }

    /**
     * A convenience lookup for the viewer strategies that render one file.
     * The media viewer would otherwise have to search the asset array by kind
     * on every render.
     *
     * @return array<string, array<string, mixed>|null>
     */
    private function media(): array
    {
        $media = [];

        foreach ([AssetKind::Image, AssetKind::Audio, AssetKind::Model3d] as $kind) {
            $asset = $this->resource->assets->firstWhere('kind', $kind);

            $media[$kind->value] = $asset === null ? null : [
                'url' => $asset->url(),
                'mime' => $asset->mime,
                'bytes' => $asset->bytes,
                'meta' => $asset->meta,
            ];
        }

        return $media;
    }
}
