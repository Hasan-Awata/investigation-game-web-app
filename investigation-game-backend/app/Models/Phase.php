<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Phase extends Model
{
    protected $fillable = [
        'case_id',
        'title',
        'description',
        'order_index',
    ];

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }

    public function levels(): HasMany
    {
        return $this->hasMany(Level::class, 'phase_id');
    }
}