<?php

namespace App\Support\Case;

class LegacyStrikePenalty
{
    public static function convert(array $outcomes, int $maxStrikes, bool $isLocation): array
    {
        if (! $isLocation && filter_var($outcomes['gives_strike'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $outcomes['trust_loss'] = (int) ceil(100 / max(1, $maxStrikes));
        }

        unset($outcomes['gives_strike']);

        return $outcomes;
    }
}
