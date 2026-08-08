<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Casts\Attribute; 
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class GameCase extends Model
{
    /**
     * The table associated with the model.
     * Required because the model is GameCase but the table is 'cases'.
     */
    protected $table = 'cases';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'story',
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
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }
    
    /**
     * A case is divided into sequential levels.
     */
    public function levels(): HasManyThrough
    {
    return $this->hasManyThrough(Level::class, Phase::class, 'case_id', 'phase_id');
    }

    public function phases(): HasMany
    {
        return $this->hasMany(Phase::class, 'case_id');
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(Evidence::class, 'case_id');
    }

    public function investigationRequests(): HasMany
    {
        return $this->hasMany(InvestigationRequest::class, 'case_id');
    }
    
    /**
     * A case can have multiple multiplayer rooms instantiated from it.
     */
    public function rooms(): HasMany
    {
        return $this->hasMany(GameRoom::class, 'case_id');
    }

    /**
     * Users who have played or solved this case, tracked via the case_user pivot table.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'case_user', 'case_id', 'user_id')
            ->withPivot('status', 'completed_at')
            ->withTimestamps();
    }

    public function suspects(): HasMany
    {
        return $this->hasMany(Suspect::class, 'case_id');
    }
    
    public function victims()
    { 
        return $this->hasMany(Victim::class, 'case_id');
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
}