<?php

namespace App\Models;

use App\Models\Concerns\HasMediaUrls;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Enums\LevelPresentationType;

class Level extends Model
{
    use HasMediaUrls;
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
    


    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'zone_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class, 'level_id')
            ->orderBy('order_index')
            ->orderBy('id');
    }

    public function requiredRequest(): BelongsTo
    {
        return $this->belongsTo(InvestigationRequest::class, 'required_request_id');
    }
}
