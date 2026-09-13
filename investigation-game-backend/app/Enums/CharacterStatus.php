<?php

namespace App\Enums;

enum CharacterStatus: string
{
    case Available = 'available';
    case Deceased = 'deceased';
    case Fled = 'fled';
    case Incarcerated = 'incarcerated';
}