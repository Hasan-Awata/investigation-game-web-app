<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zone extends Model
{
    protected $fillable = [
        'case_id',
        'title',
        'description',
        'order_index',
        'coord_x',
        'coord_y'
    ];

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }

    public function levels(): HasMany
    {
        return $this->hasMany(Level::class, 'zone_id');
    }
}