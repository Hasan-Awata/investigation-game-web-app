<?php

namespace App\Models;

use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Enums\RoomStatus;

class GameRoom extends Model
{
    use MassPrunable;

    protected $fillable = [
        'case_id',
        'host_user_id',
        'invite_code',
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

    public function gameCase(): BelongsTo { return $this->belongsTo(GameCase::class, 'case_id'); }
    public function host(): BelongsTo { return $this->belongsTo(User::class, 'host_user_id'); }
    public function users(): HasMany { return $this->hasMany(RoomUser::class, 'room_id'); }
    public function votes(): HasMany { return $this->hasMany(RoomVote::class, 'room_id'); }
    public function encounterGroups(): HasMany { return $this->hasMany(EncounterGroup::class, 'room_id'); }
    public function questionResolutions(): HasMany { return $this->hasMany(RoomQuestionResolution::class, 'room_id'); }

    public function inspections(): HasMany {
        return $this->hasMany(RoomInspection::class, 'room_id');
    }
    public function filedRequests(): HasMany {
        return $this->hasMany(RoomFiledRequest::class, 'room_id')->orderBy('created_at', 'desc');
    }

    public function unlockedEvidences() { return $this->belongsToMany(Evidence::class, 'room_evidences', 'room_id', 'evidence_id')->withTimestamps(); }
    public function unlockedLevels() { return $this->belongsToMany(Level::class, 'room_unlocked_levels', 'room_id', 'level_id')->withTimestamps(); }
    public function completedLevels() { return $this->belongsToMany(Level::class, 'room_completed_levels', 'room_id', 'level_id')->withTimestamps(); }
    public function completedRequests() { return $this->belongsToMany(InvestigationRequest::class, 'room_investigation_requests', 'room_id', 'request_id')->withTimestamps(); }

    public function characters(): BelongsToMany {
        return $this->belongsToMany(Character::class, 'room_characters', 'room_id', 'character_id')
            ->withPivot('status', 'is_unlocked')
            ->withTimestamps();
    }

    public function unlockedCharacters(): BelongsToMany
    {
        return $this->characters()->wherePivot('is_unlocked', true);
    }

    public function getPossessedEvidenceIds(): array
    {
        return $this->unlockedEvidences()
            ->pluck('evidences.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function getUnlockedCharacterIds(): array
    {
        return $this->unlockedCharacters()
            ->pluck('characters.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function isLevelUnlocked(int $levelId): bool
    {
        return $this->unlockedLevels()->where('levels.id', $levelId)->exists();
    }

    public function isParticipant(int $userId): bool
    {
        if ((int) $this->host_user_id === $userId) {
            return true;
        }

        return $this->users()->where('user_id', $userId)->exists();
    }

    public function prunable()
    {
        return static::where(function ($query) {
            $query->where('status', '!=', RoomStatus::Active->value)
                ->where('updated_at', '<', now()->subDays(7));
        });
    }
}
