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

        protected function imgUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                // If it's already a full URL (Cloudinary, S3, etc.), return it as-is
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }
                // Otherwise, prepend the backend host for local storage paths
                return config('app.url') . $value;
            }
        );
    }

        protected function audioUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                // If it's already a full URL (Cloudinary, S3, etc.), return it as-is
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }
                // Otherwise, prepend the backend host for local storage paths
                return config('app.url') . $value;
            }
        );
    }

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }
}