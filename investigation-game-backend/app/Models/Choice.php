<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Choice extends Model
{
    protected $fillable = [
        'question_id',
        'text',
        'is_correct',
        'unlocks_evidence_id', 
        'unlocks_level_id',
        'unlocks_victim_id', 
        'unlocks_suspect_id' 
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
