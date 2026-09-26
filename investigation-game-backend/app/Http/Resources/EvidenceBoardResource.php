<?php

namespace App\Http\Resources;

use App\Enums\AssetKind;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Models\Evidence;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The evidence board listing.
 *
 * Deliberately omits content_payload and the asset list. A room payload
 * carries every unlocked piece of evidence, and a single long report would
 * otherwise be duplicated into the initial load, into every Reverb event, and
 * into every client's memory. The board only needs enough to render a card and
 * decide which viewer to open; the document itself is fetched on inspect.
 *
 * @mixin Evidence
 */
class EvidenceBoardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $thumbnail = $this->resource->assetOfKind(AssetKind::Image);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'evidence_type' => $this->evidence_type?->value,
            'viewer_strategy' => $this->viewer_strategy?->value,
            'paper_finish' => $this->paper_finish instanceof PaperFinish
                ? $this->paper_finish->value
                : null,
            'is_initial' => (bool) $this->is_initial,
            'is_vital_for_conviction' => (bool) $this->is_vital_for_conviction,
            'order_index' => (int) $this->order_index,
            'thumbnail_url' => $thumbnail?->url(),
            'is_paged' => $this->viewer_strategy instanceof ViewerStrategy
                && $this->requiresPages(),
        ];
    }
}
