<?php

namespace App\Events;

use App\Models\GameRoom;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VictimDiscovered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room,
        public readonly array $victimIds
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('room.' . $this->room->id)];
    }

    public function broadcastWith(): array
    {
        return [
            'victim_ids' => $this->victimIds,
            'message' => 'New casualty identified based on your deductions.'
        ];
    }
}