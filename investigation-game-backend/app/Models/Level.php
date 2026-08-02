<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute; 

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