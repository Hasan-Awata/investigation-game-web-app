<?php

namespace App\Support;

final class SharedDocumentAssets
{
    public const SIGNATURES = '/assets/documents/signatures/';

    public static function legacySignaturePath(string $filename): ?string
    {
        if (! preg_match('/^signature(?:-([1-9]|1[0-8]))?\.svg$/D', $filename, $match)) {
            return null;
        }

        return self::SIGNATURES.sprintf('signature_%02d.svg', (int) ($match[1] ?? 0) + 1);
    }
}
