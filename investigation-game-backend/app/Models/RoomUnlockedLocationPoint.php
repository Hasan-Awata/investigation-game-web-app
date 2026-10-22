<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomUnlockedLocationPoint extends Model
{
    protected $fillable = ['room_id', 'choice_id'];
}
