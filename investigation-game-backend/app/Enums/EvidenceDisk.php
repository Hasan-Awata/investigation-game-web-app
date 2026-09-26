<?php

namespace App\Enums;

/**
 * Storage backend an evidence asset was written to.
 */
enum EvidenceDisk: string
{
    case Public = 'public';
    case Cloudinary = 'cloudinary';
}
