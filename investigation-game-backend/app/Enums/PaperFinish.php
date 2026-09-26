<?php

namespace App\Enums;

/**
 * Paper stock applied to a ViewerStrategy::Paper sheet. The legacy finishes
 * (sticky, typewriter, dark-forensic) were removed; only the blank white sheet
 * and the manila ballistics envelope remain.
 */
enum PaperFinish: string
{
    case Blank = 'blank';
    case Manila = 'manila';
}
