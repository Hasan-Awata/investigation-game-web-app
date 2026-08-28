<?php

namespace App\Events;

use App\Models\GameRoom;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LevelTransitioned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room,
        public readonly ?string $message = null,
        public readonly ?array $stats = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('room.' . $this->room->id),
        ];
    }

    public function broadcastWith(): array
    {
        // 1 query to gather the newly updated completed levels state
        $completedLevels = $this->room->completedLevels()->get();

        return [
            'room_id' => $this->room->id,
            'status' => $this->room->status->value,
            'message' => $this->message,
            'stats' => $this->stats,
            // The precise state patch to synchronize TanStack's cache
            'room_patch' => [
                'current_level_id' => $this->room->current_level_id,
                'status' => $this->room->status->value,
                'completed_levels' => $completedLevels->toArray(),
            ]
        ];
    }
}