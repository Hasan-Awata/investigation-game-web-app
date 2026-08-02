<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Level extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'case_id',
        'title',
        'details',
        'img_url', 
        'order_index',
        'is_initial', // NEW
    ];

    protected function casts(): array
    {
        return [
            'is_initial' => 'boolean',
        ];
    }

    /**
     * A level belongs to a specific parent case.
     */
    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }

    /**
     * The puzzles/verdicts players must solve to clear this level.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class, 'level_id');
    }
}