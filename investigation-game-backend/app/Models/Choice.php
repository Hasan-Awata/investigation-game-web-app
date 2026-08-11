<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Choice extends Model
{
    protected $fillable = [
        'question_id',
        'text',
        'outcomes',
        'requirements' 
    ];

    protected function casts(): array
    {
        return [
            'outcomes' => 'array', 
            'requirements' => 'array', 
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}