<?php

namespace App\Events;

use App\Models\GameRoom;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HostMigrated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room,
        public readonly User $newHost
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('room.' . $this->room->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'room_id' => $this->room->id,
            'new_host_id' => $this->newHost->id,
            'new_host_name' => $this->newHost->username,
            'message' => "Host disconnected. Operational command transferred to Agent {$this->newHost->username}."
        ];
    }
}