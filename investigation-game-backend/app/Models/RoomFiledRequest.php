<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class RoomFiledRequest extends Model {
    protected $fillable = ['room_id', 'request_type', 'evidence_ids'];
    protected $casts = ['evidence_ids' => 'array'];
}