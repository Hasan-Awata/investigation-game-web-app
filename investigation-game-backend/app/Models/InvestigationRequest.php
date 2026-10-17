<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Enums\InvestigationRequestType;

class InvestigationRequest extends Model
{
    public const MIN_REQUIRED_ITEMS = 2;
    public const MIN_ITEMS_MESSAGE = 'A procedural request requires at least two items.';

    /**
     * Single source of truth for the ">= 2 items" gameplay predicate.
     *
     * Every gate (player endpoint, domain service, admin form) delegates here
     * so the rule can never drift between the three enforcement sites.
     */
    public static function hasMinimumItems(int $evidenceCount, int $characterCount): bool
    {
        return $evidenceCount + $characterCount >= self::MIN_REQUIRED_ITEMS;
    }

    protected $fillable = [
        'case_id',
        'request_type',
        'unlocks_evidence_id',
        'unlocks_level_id'
    ];

    protected function casts(): array
    {
        return [
            'request_type' => InvestigationRequestType::class,
        ];
    }

    public function requiredEvidences(): BelongsToMany
    {
        return $this->belongsToMany(
            Evidence::class, 
            'investigation_request_items', 
            'request_id', 
            'evidence_id',
        );
    }

    public function requiredCharacters(): BelongsToMany
    {
        return $this->belongsToMany(
            Character::class,
            'investigation_request_characters',
            'request_id',
            'character_id',
        );
    }

    public function unlockedEvidence(): BelongsTo
    {
        return $this->belongsTo(Evidence::class, 'unlocks_evidence_id');
    }

    public function unlockedLevel(): BelongsTo
    {
        return $this->belongsTo(Level::class, 'unlocks_level_id');
    }
}