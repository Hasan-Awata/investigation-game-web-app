<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute; 
use App\Enums\LevelPresentationType; 
use App\Enums\InvestigationRequestType; 

class Level extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'phase_id', 
        'title',
        'details',
        'img_url', 
        'order_index',
        'is_initial',
        'presentation_type', 
        'required_request_id',     
    ];

    protected function casts(): array
    {
        return [
            'is_initial' => 'boolean',
            'presentation_type' => LevelPresentationType::class, 
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
     * A level belongs to a specific parent phase.
     */
    public function phase(): BelongsTo
    {
        return $this->belongsTo(Phase::class, 'phase_id');
    }

    /**
     * The puzzles/verdicts players must solve to clear this level.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class, 'level_id');
    }

    public function requiredRequest(): BelongsTo
    {
        return $this->belongsTo(InvestigationRequest::class, 'required_request_id');
    }
}