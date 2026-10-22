<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomQuestionResolution extends Model
{
    protected $fillable = ['room_id', 'level_id', 'question_id', 'choice_id', 'encounter_group_id', 'resolved_at'];

    protected function casts(): array { return ['resolved_at' => 'datetime']; }

    public function room(): BelongsTo { return $this->belongsTo(GameRoom::class, 'room_id'); }
    public function level(): BelongsTo { return $this->belongsTo(Level::class); }
    public function question(): BelongsTo { return $this->belongsTo(Question::class); }
    public function choice(): BelongsTo { return $this->belongsTo(Choice::class); }
    public function group(): BelongsTo { return $this->belongsTo(EncounterGroup::class, 'encounter_group_id'); }
}
