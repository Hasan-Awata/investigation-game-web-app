<?php

namespace App\Enums;

enum EvidenceSurface: string
{
    case Paper = 'paper';
    case Terminal = 'terminal';
    case Testimony = 'testimony';
    case Media = 'media';

    public function metadataKey(): ?string
    {
        return match ($this) {
            self::Paper => 'doc',
            self::Terminal => 'terminal',
            self::Testimony => null,
            self::Media => null,
        };
    }
}