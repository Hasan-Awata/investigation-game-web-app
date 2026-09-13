<?php

namespace App\Enums;

enum CharacterCharge: string
{
    case Murder = 'murder';
    case Fraud = 'fraud';
    case Conspiracy = 'conspiracy';
    case Blackmail = 'blackmail';
    case Theft = 'theft';
    case Accomplice = 'accomplice';
}