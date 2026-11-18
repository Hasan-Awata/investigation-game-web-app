<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class ManagementTrustChanged implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int $roomId,
        public readonly int $managementTrust,
        public readonly int $trustLoss,
        public readonly string $reason,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('room.'.$this->roomId);
    }

    public function broadcastWith(): array
    {
        return [
            'management_trust' => $this->managementTrust,
            'trust_loss' => $this->trustLoss,
            'reason' => $this->reason,
        ];
    }
}
