<?php

namespace App\Http\Controllers;

use App\Http\Resources\EvidenceDetailResource;
use App\Models\Evidence;
use App\Models\GameRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Serves a single evidence document to a player who has actually unlocked it.
 *
 * The board listing deliberately ships no content, so this is the only route
 * that hands out a payload. That makes it the place where possession has to be
 * proven, and the place where a leak would be most damaging.
 */
class RoomEvidenceController extends Controller
{
    public function show(Request $request, GameRoom $room, Evidence $evidence): JsonResponse
    {
        $player = $request->user();

        if (! $this->isMember($room, $player->id)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'You are not a member of this room.',
            ], 403);
        }

        // An evidence from another case must be indistinguishable from one that
        // does not exist, otherwise the route becomes a case-enumeration oracle.
        if ($evidence->case_id !== $room->case_id) {
            return $this->notFound();
        }

        // Likewise for evidence this room has not unlocked. A detective game
        // that 403s on unclaimed evidence tells the player it is there.
        $unlocked = $room->unlockedEvidences()
            ->where('evidences.id', $evidence->id)
            ->exists();

        if (! $unlocked) {
            return $this->notFound();
        }

        return response()->json([
            'evidence' => new EvidenceDetailResource($evidence->load('assets')),
        ]);
    }

    private function isMember(GameRoom $room, int $userId): bool
    {
        if ($room->host_user_id === $userId) {
            return true;
        }

        return $room->users()->where('user_id', $userId)->exists();
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'error' => 'Not Found',
            'message' => 'This evidence has not been added to your case file.',
        ], 404);
    }
}
