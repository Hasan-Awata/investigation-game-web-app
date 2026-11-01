<?php

namespace App\Enums;

enum RoomLeaveReason: string
{
    case Explicit = 'explicit';
    case PageHide = 'pagehide';
}
