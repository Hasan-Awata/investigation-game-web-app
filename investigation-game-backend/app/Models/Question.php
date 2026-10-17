<?php

namespace App\Models;

use App\Models\Concerns\HasMediaUrls;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Question extends Model
{
    use HasMediaUrls;
    protected $fillable = [
        'level_id',
        'order_index',
        'text',
        'img_url',
        'audio_url',
    ];

    protected function casts(): array
    {
        return ['order_index' => 'integer'];
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
