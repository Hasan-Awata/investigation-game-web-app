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

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('room.' . $this->room->id),
        ];
    }

    /**
     * The data to broadcast to the frontend.
     */
    public function broadcastWith(): array
    {
        // Load the fresh level data to send down the wire
        $this->room->load([
            'currentLevel.questions.choices'
        ]);

        return [
            'room' => $this->room,
            'status' => $this->room->status->value, 
            'message' => $this->message, 
            'stats' => $this->stats, 
        ];
    }
}