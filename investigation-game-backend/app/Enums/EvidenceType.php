<?php

namespace App\Enums;

use App\Enums\EvidenceSurface;

enum EvidenceType: string
{
    case Document = 'document';
    case Testimony = 'testimony';
    case Audio = 'audio';
    case Image = 'image';
    case Forensic = 'forensic';
    case Digital = 'digital';

    public function label(): string
    {
        return match ($this) {
            self::Document => 'Written Document',
            self::Testimony => 'Witness Testimony',
            self::Audio => 'Audio Recording',
            self::Image => 'Photographic Evidence',
            self::Forensic => 'Forensic Report',
            self::Digital => 'Digital Evidence',
        };
    }

    public function surface(): EvidenceSurface
    {
        return match ($this) {
            self::Document, self::Forensic => EvidenceSurface::Paper,
            self::Digital => EvidenceSurface::Terminal,
            self::Testimony => EvidenceSurface::Testimony,
            self::Audio, self::Image => EvidenceSurface::Media,
        };
    }
}