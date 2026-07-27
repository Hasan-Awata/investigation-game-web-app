<?php

namespace App\Enums;

enum EvidenceType: string
{
    case Document = 'document';
    case Testimony = 'testimony';
    case Audio = 'audio';
    case Image = 'image';
    case Forensic = 'forensic';

    /**
     * Optional: You can add helper methods right inside the enum
     * to format labels for your frontend UI.
     */
    public function label(): string
    {
        return match($this) {
            self::Document => 'Written Document',
            self::Testimony => 'Witness Testimony',
            self::Audio => 'Audio Recording',
            self::Image => 'Photographic Evidence',
            self::Forensic => 'Forensic Report',
        };
    }
}