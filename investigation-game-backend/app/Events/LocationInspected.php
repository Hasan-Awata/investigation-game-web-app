<?php

namespace App\Events;

use App\Models\GameRoom;
use App\Models\RoomInspection;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LocationInspected implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room, 
        public readonly RoomInspection $inspection
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('room.' . $this->room->id)
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'inspection' => $this->inspection->toArray()
        ];
    }
}