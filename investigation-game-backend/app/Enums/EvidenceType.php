<?php

namespace App\Enums;

enum EvidenceType: string
{
    case Document = 'document';
    case Testimony = 'testimony';
    case Audio = 'audio';
    case Image = 'image';
    case Forensic = 'forensic';

    public function surface(): EvidenceSurface
    {
        return match ($this) {
            self::Document, self::Forensic => EvidenceSurface::Paper,
            self::Testimony => EvidenceSurface::Testimony,
            self::Audio, self::Image => EvidenceSurface::Media,
        };
    }
}
