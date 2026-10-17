<?php

namespace App\Models;

use App\Models\Concerns\HasMediaUrls;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\EvidenceType;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Evidence extends Model
{
    use HasMediaUrls;
    protected $table = 'evidences';

    protected $fillable = [
        'case_id', 
        'title',
        'description',
        'evidence_type',
        'metadata',    
        'audio_url',
        'img_url',
        'is_initial',
        'is_vital_for_conviction', 
    ];

    protected function casts(): array
    {
        return [
            'evidence_type' => EvidenceType::class,
            'metadata' => 'array', 
            'is_initial' => 'boolean',
            'is_vital_for_conviction' => 'boolean', 
        ];
    }



    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }
}