<?php

namespace App\Events;

use App\Models\GameRoom;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Database\Eloquent\Collection;

class ItemsUnlocked implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room,
        public readonly ?Collection $unlockedEvidences = null,
        public readonly ?Collection $unlockedLevels = null,
        public readonly ?array $characterUpdates = null,
        public readonly ?int $strikes = null
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
            'unlocked_evidences' => $this->unlockedEvidences ? $this->unlockedEvidences->toArray() : [],
            'unlocked_levels' => $this->unlockedLevels ? $this->unlockedLevels->toArray() : [],
            'character_updates' => $this->characterUpdates ?? [],
            'strikes' => $this->strikes,
        ];
    }
}