<?php

namespace App\Events;

use App\Models\GameRoom;
use App\Models\RoomVote;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoteLockedIn implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room,
        public readonly RoomVote $vote
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Broadcast strictly to this specific room's private channel
        return [
            new PrivateChannel('room.' . $this->room->id),
        ];
    }

    /**
     * The data to broadcast to the frontend.
     */
    public function broadcastWith(): array
    {
        return [
            'vote' => [
                'id' => $this->vote->id,
                'user_id' => $this->vote->user_id,
                'question_id' => $this->vote->question_id,
                'choice_id' => $this->vote->choice_id,
            ]
        ];
    }
}