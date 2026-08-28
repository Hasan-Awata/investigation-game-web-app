<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class RoomInspection extends Model {
    protected $fillable = ['room_id', 'choice_id', 'is_dead_end'];
    protected $casts = ['is_dead_end' => 'boolean'];
}