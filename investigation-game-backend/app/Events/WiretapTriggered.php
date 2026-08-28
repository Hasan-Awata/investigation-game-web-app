<?php

namespace App\Events;

use App\Models\GameRoom;
use App\Models\Question;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WiretapTriggered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GameRoom $room,
        public readonly Question $question
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
            'question_id' => $this->question->id,
            'audio_url' => $this->question->audio_url,
            'message' => 'Wiretap feed active. Listen carefully.',
            'played_wiretap' => $this->question->toArray()
        ];
    }
}