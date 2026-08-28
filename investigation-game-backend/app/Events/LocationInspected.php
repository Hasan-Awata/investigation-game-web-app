<?php
namespace App\Events;
use App\Models\GameRoom;
use App\Models\RoomFiledRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RequestFiled implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public GameRoom $room, public RoomFiledRequest $request) {}
    public function broadcastOn(): array { return [new PrivateChannel('room.' . $this->room->id)]; }
    public function broadcastWith(): array { return ['filed_request' => $this->request->toArray()]; }
}