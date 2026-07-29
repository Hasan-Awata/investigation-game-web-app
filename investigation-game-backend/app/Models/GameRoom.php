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
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    
    protected function casts(): array
    {
        return [
            'status' => RoomStatus::class,
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
}