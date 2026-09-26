<?php

namespace App\Enums;

enum EvidenceType: string
{
    case Document = 'document';
    case Forensic = 'forensic';
    case Ballistics = 'ballistics';
    case Testimony = 'testimony';
    case Digital = 'digital';
    case Image = 'image';
    case Audio = 'audio';
    case Custom = 'custom';

    /**
     * The thumbnail currently rendered on the Evidence Board for this type.
     * Every value is backed by a component in the frontend ThumbnailRegistry.
     */
    public function label(): string
    {
        return match ($this) {
            self::Document => 'Written Document',
            self::Forensic => 'Forensic Report',
            self::Ballistics => 'Ballistics Analysis',
            self::Testimony => 'Witness Testimony',
            self::Digital => 'Digital Forensics',
            self::Image => 'Photographic Evidence',
            self::Audio => 'Audio Recording',
            self::Custom => 'Physical Object',
        };
    }
}
