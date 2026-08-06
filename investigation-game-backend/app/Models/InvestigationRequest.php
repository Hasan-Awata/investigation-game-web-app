<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Enums\InvestigationRequestType;

class InvestigationRequest extends Model
{
    protected $fillable = [
        'case_id',
        'request_type',
        'unlocks_evidence_id'
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
            'evidence_id'
        );
    }

    public function unlockedEvidence(): BelongsTo
    {
        return $this->belongsTo(Evidence::class, 'unlocks_evidence_id');
    }
}