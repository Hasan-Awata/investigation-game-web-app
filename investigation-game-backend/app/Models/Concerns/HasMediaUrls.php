<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Casts\Attribute;

trait HasMediaUrls
{
    protected function formatMediaUrl(?string $value): ?string
    {
        if (!$value) {
            return null;
        }
        if (str_starts_with($value, "http://") || str_starts_with($value, "https://")) {
            return $value;
        }
        return rtrim((string) config("app.url"), "/") . "/" . ltrim($value, "/");
    }

    protected function imgUrl(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $this->formatMediaUrl($value),
        );
    }

    protected function audioUrl(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $this->formatMediaUrl($value),
        );
    }
}

