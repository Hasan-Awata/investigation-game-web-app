<?php

namespace App\Enums;

/**
 * The global block catalog. Every case is available to every evidence type;
 * the prop schema for each is owned by BlockCatalog.
 */
enum EvidenceBlockType: string
{
    case Text = 'text';
    case Table = 'table';
    case Signature = 'signature';
    case Stamp = 'stamp';
}
