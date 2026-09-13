<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Enums\LevelPresentationType;

class Level extends Model
{
    protected $fillable = [
        'zone_id',
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

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'zone_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class, 'level_id');
    }

    public function requiredRequest(): BelongsTo
    {
        return $this->belongsTo(InvestigationRequest::class, 'required_request_id');
    }
}