<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute; 

class Victim extends Model
{
    protected $fillable = [
        'case_id', 'name', 'background', 'img_url', 'is_initial',
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