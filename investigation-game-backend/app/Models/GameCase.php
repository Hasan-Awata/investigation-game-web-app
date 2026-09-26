<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class GameCase extends Model
{
    use HasFactory;

    protected $table = 'cases';

    protected $fillable = [
        'title',
        'story',
        'map_url',
        'min_player_XP',
        'XP_on_solve',
        'max_strikes',
        'img_url',
        'rating_stars',
        'age_rating',
        'estimated_playtime',
        'difficulty',
        'tags',
        'author_name',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function levels(): HasManyThrough
    {
        return $this->hasManyThrough(Level::class, Zone::class, 'case_id', 'zone_id');
    }

    public function zones(): HasMany
    {
        return $this->hasMany(Zone::class, 'case_id');
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(Evidence::class, 'case_id');
    }

    public function investigationRequests(): HasMany
    {
        return $this->hasMany(InvestigationRequest::class, 'case_id');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(GameRoom::class, 'case_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'case_user', 'case_id', 'user_id')
            ->withPivot('status', 'completed_at')
            ->withTimestamps();
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class, 'case_id');
    }

    protected function imgUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (! $value) {
                    return null;
                }
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }

                return config('app.url').$value;
            }
        );
    }
}
