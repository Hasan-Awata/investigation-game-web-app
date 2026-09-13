<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Enums\CharacterStatus;
use App\Enums\CharacterCharge;

class Character extends Model
{
    protected $fillable = [
        'case_id',
        'name',
        'background',
        'img_url',
        'is_initial',
        'is_guilty',
        'charge',
        'default_status',
    ];

    protected function casts(): array
    {
        return [
            'is_initial' => 'boolean',
            'is_guilty' => 'boolean',
            'charge' => CharacterCharge::class,
            'default_status' => CharacterStatus::class,
        ];
    }

    protected function imgUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                if (filter_var($value, FILTER_VALIDATE_URL)) return $value;
                return config('app.url') . $value;
            }
        );
    }

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }
}