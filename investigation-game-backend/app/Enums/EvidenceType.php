<?php

namespace App\Enums;

enum EvidenceType: string
{
    case Document = 'document';
    case Testimony = 'testimony';
    case Audio = 'audio';
    case Image = 'image';
    case Forensic = 'forensic';

    public function isPaper(): bool
    {
        return $this === self::Document || $this === self::Forensic;
    }
}
