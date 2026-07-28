<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
protected $fillable = [
        'level_id',
        'text',
        'img_url',
        'msg_when_wrong',
        'is_mandatory', 
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function choices(): HasMany
    {
        return $this->hasMany(Choice::class);
    }
}
