<?php

namespace App\Models;

use App\Enums\AssetKind;
use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Services\Evidence\ViewerStrategyLegality;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A single piece of evidence belonging to a case.
 *
 * Presentation is stored rather than derived. `viewer_strategy` and
 * `paper_finish` are resolved once by PresentationResolver when the evidence is
 * written, so the client never has to reimplement the type/strategy matrix and
 * two pieces of evidence of the same type cannot render differently.
 */
class Evidence extends Model
{
    use HasFactory;

    protected $table = 'evidences';

    protected $fillable = [
        'case_id',
        'title',
        'description',
        'evidence_type',
        'viewer_strategy',
        'paper_finish',
        'is_initial',
        'is_vital_for_conviction',
        'order_index',
        'content_payload',
    ];

    protected function casts(): array
    {
        return [
            'evidence_type' => EvidenceType::class,
            'viewer_strategy' => ViewerStrategy::class,
            'paper_finish' => PaperFinish::class,
            'content_payload' => 'array',
            'is_initial' => 'boolean',
            'is_vital_for_conviction' => 'boolean',
            'order_index' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // The last line of defence for the presentation invariant. The form
        // request and the import path both resolve presentation before saving,
        // so reaching this exception means a code path bypassed them.
        static::saving(function (self $evidence): void {
            $legality = app(ViewerStrategyLegality::class);

            if (! $evidence->evidence_type instanceof EvidenceType) {
                return;
            }

            if (! $evidence->viewer_strategy instanceof ViewerStrategy) {
                return;
            }

            $legality->assertLegal($evidence->evidence_type, $evidence->viewer_strategy);
            $legality->assertLegalFinish(
                $evidence->evidence_type,
                $evidence->viewer_strategy,
                $evidence->paper_finish
            );
        });
    }

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(EvidenceAsset::class);
    }

    /**
     * The first asset of a given kind, or null. The viewer strategies that need
     * a single file (photo, clip, model) use this instead of assuming an index.
     */
    public function assetOfKind(AssetKind $kind): ?EvidenceAsset
    {
        return $this->assets->firstWhere('kind', $kind);
    }

    public function requiresPages(): bool
    {
        return app(ViewerStrategyLegality::class)->requiresPages($this->viewer_strategy);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order_index')->orderBy('id');
    }
}
