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

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('room.' . $this->room->id),
        ];
    }

    public function broadcastWith(): array
    {
        // Shipped as a complete object for the frontend to patch directly
        return [
            'vote' => $this->vote->toArray()
        ];
    }
}