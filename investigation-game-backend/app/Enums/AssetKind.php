<?php

namespace App\Enums;

/**
 * Binary attachments for an evidence. Replaces the previous img_url/audio_url
 * column pair, whose consumer had to guess intent from the column it happened
 * to find populated.
 */
enum AssetKind: string
{
    case Image = 'image';
    case Audio = 'audio';
    case Model3d = 'model_3d';
}
