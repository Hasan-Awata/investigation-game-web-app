<?php

namespace App\Http\Middleware;

use App\Models\GameRoom;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRoomParticipant
{
    public function handle(Request $request, Closure $next): Response
    {
        $room = $request->route('room');

        if (! $room instanceof GameRoom) {
            $room = GameRoom::find($room);
        }

        if (! $room instanceof GameRoom) {
            return response()->json([
                'message' => 'This room could not be found.',
            ], 404);
        }

        if (! $room->isParticipant($request->user()->id)) {
            return response()->json([
                'message' => 'You are not a participant in this room.',
            ], 403);
        }

        return $next($request);
    }
}
