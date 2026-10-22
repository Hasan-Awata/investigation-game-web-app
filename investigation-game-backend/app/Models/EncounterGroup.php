<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EncounterGroup extends Model
{
    protected $fillable = [
        'room_id', 'level_id', 'creator_user_id', 'active_room_id', 'active_level_id', 'status', 'current_question_id',
        'finalizes_at', 'roster_frozen_at', 'completed_at', 'abandoned_at',
    ];

    protected function casts(): array
    {
        return ['finalizes_at' => 'datetime', 'roster_frozen_at' => 'datetime', 'completed_at' => 'datetime', 'abandoned_at' => 'datetime'];
    }

    public function room(): BelongsTo { return $this->belongsTo(GameRoom::class, 'room_id'); }
    public function level(): BelongsTo { return $this->belongsTo(Level::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'creator_user_id'); }
    public function members(): HasMany { return $this->hasMany(EncounterGroupMember::class); }
    public function votes(): HasMany { return $this->hasMany(RoomVote::class); }
}
