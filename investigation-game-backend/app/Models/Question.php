<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Question extends Model
{
    protected $fillable = [
        'level_id',
        'text',
        'img_url',
        'audio_url',
        'msg_when_wrong',
        'is_mandatory', 
    ];

    protected function audioUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                if (filter_var($value, FILTER_VALIDATE_URL)) return $value;
                return config('app.url') . $value;
            }
        );
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

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function choices(): HasMany
    {
        return $this->hasMany(Choice::class);
    }
}
