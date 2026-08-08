<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Enums\RoomStatus;

class GameRoom extends Model
{
    protected $fillable = [
        'case_id',
        'host_user_id',
        'invite_code',
        'current_level_id',
        'status',
        'strikes', 
        'final_stats', 
    ];

    protected function casts(): array
    {
        return [
            'status' => RoomStatus::class,
            'final_stats' => 'array', 
        ];
    }

    public function gameCase(): BelongsTo
    {
        return $this->belongsTo(GameCase::class, 'case_id');
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function currentLevel(): BelongsTo
    {
        return $this->belongsTo(Level::class, 'current_level_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(RoomUser::class, 'room_id');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(RoomVote::class, 'room_id');
    }

    public function unlockedEvidences()
    {
        return $this->belongsToMany(Evidence::class, 'room_evidences', 'room_id', 'evidence_id')
                    ->withTimestamps();
    }
    
    public function unlockedLevels()
    {
        return $this->belongsToMany(Level::class, 'room_unlocked_levels', 'room_id', 'level_id')
                    ->withTimestamps();
    }

    public function unlockedSuspects()
    {
        return $this->belongsToMany(Suspect::class, 'room_suspects', 'room_id', 'suspect_id')
                    ->withTimestamps();
    }

    public function completedLevels()
    {
        return $this->belongsToMany(Level::class, 'room_completed_levels', 'room_id', 'level_id')
                    ->withTimestamps();
    }

    public function unlockedVictims()
    { 
        return $this->belongsToMany(Victim::class, 'room_victims', 'room_id', 'victim_id')
                    ->withTimestamps(); 
    }

    public function playedWiretaps()
    {
        return $this->belongsToMany(Question::class, 'room_played_wiretaps', 'room_id', 'question_id')
                    ->withTimestamps();
    }    
}