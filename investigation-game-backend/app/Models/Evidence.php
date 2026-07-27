<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\EvidenceType;

class Evidence extends Model
{
    protected $table = 'evidences';

    protected $fillable = [
        'level_id',
        'title',
        'description',
        'evidence_type',
        'audio_url',
        'img_url',
        'paragraph',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    
    protected function casts(): array
    {
        return [
            'evidence_type' => EvidenceType::class,
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }
}
