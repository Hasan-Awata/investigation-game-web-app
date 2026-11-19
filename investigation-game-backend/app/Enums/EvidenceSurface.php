<?php

namespace App\Enums;

enum EvidenceSurface: string
{
    case Paper = 'paper';
    case Testimony = 'testimony';
    case Media = 'media';

    public function metadataKey(): ?string
    {
        return match ($this) {
            self::Paper => 'doc',
            self::Testimony => null,
            self::Media => null,
        };
    }
}
