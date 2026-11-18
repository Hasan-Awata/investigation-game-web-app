<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class RoomParticipantRemoved implements ShouldBroadcastNow
{
    public function __construct(public readonly int $roomId) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('room.'.$this->roomId);
    }

    public function broadcastWith(): array
    {
        return ['room_id' => $this->roomId];
    }
}
