<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\EvidenceType;

class Evidence extends Model
{
    protected $table = 'evidences';

    protected $fillable = [
        'case_id', 
        'title',
        'description',
        'evidence_type',
        'audio_url',
        'img_url',
        'paragraph',
        'is_initial',
    ];

    protected function casts(): array
    {
        return [
            'evidence_type' => EvidenceType::class,
            'is_initial' => 'boolean',
        ];
    }

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }
}