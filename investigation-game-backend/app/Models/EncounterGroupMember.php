<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EncounterGroupMember extends Model
{
    protected $fillable = ['encounter_group_id', 'user_id', 'active_user_id', 'joined_at', 'left_at'];

    protected function casts(): array { return ['joined_at' => 'datetime', 'left_at' => 'datetime']; }

    public function group(): BelongsTo { return $this->belongsTo(EncounterGroup::class, 'encounter_group_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
