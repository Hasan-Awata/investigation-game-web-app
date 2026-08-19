<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\EvidenceType;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Evidence extends Model
{
    protected $table = 'evidences';

    protected $fillable = [
        'case_id', 
        'title',
        'description',
        'evidence_type',
        'sub_type',    
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

    protected function imgUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }
                return config('app.url') . $value;
            }
        );
    }

    protected function audioUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }
                return config('app.url') . $value;
            }
        );
    }

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }
}