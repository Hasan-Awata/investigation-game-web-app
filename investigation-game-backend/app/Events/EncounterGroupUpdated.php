<?php

namespace App\Events;

use App\Models\EncounterGroup;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class EncounterGroupUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly EncounterGroup $group) {}

    public function broadcastOn(): array { return [new PrivateChannel('room.'.$this->group->room_id)]; }

    public function broadcastWith(): array
    {
        $voters = $this->group->current_question_id
            ? DB::table('encounter_question_voters')->where('encounter_group_id', $this->group->id)->where('question_id', $this->group->current_question_id)->whereNull('left_at')->get()
            : collect();
        $votes = $this->group->current_question_id
            ? $this->group->votes()->where('question_id', $this->group->current_question_id)->get(['id', 'room_id', 'encounter_group_id', 'user_id', 'question_id', 'choice_id'])
            : collect();
        $requiredIds = $voters->pluck('user_id');
        $resolution = $this->group->room->questionResolutions()
            ->where('encounter_group_id', $this->group->id)
            ->latest('resolved_at')
            ->first();
        $tally = [];
        foreach ($votes->whereIn('user_id', $requiredIds) as $vote) {
            $weight = (int) $vote->user_id === (int) $this->group->creator_user_id ? 2 : 1;
            $tally[$vote->choice_id] = ($tally[$vote->choice_id] ?? 0) + $weight;
        }
        return [
            'group_id' => $this->group->id,
            'room_id' => $this->group->room_id,
            'level_id' => $this->group->level_id,
            'creator_user_id' => $this->group->creator_user_id,
            'status' => $this->group->status,
            'current_question_id' => $this->group->current_question_id,
            'finalizes_at' => $this->group->finalizes_at?->toISOString(),
            'members' => $this->group->members()->whereNull('left_at')->with('user:id,name')->get(['user_id', 'joined_at']),
            'required_voter_ids' => $voters->pluck('user_id'),
            'votes' => $votes,
            'tally' => $tally,
            'resolution' => $resolution,
        ];
    }
}
