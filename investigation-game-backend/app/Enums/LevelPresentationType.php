<?php

namespace App\Enums;

enum LevelPresentationType: string
{
    case Interrogation = 'interrogation';
    case Location = 'location'; 
    case Wiretap = 'wiretap'; 
}
