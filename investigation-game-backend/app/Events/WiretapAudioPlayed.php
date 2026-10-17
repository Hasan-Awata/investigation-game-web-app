<?php

namespace App\Events;

use App\Models\Question;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WiretapAudioPlayed implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $roomId,
        public readonly int $questionId,
        public readonly int $playerId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('room.' . $this->roomId),
        ];
    }

    public function broadcastWith(): array
    {
        $question = Question::find($this->questionId);

        return [
            'question_id' => $this->questionId,
            'player_id' => $this->playerId,
            'audio_url' => $question?->audio_url,
            'message' => 'Wiretap feed active. Listen carefully.',
            'played_wiretap' => $question?->toArray(),
        ];
    }
}
