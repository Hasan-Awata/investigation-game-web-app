<?php

namespace App\Http\Controllers;

use App\Models\GameCase;
use App\Services\GameRoomService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\GameRoom;

class GameRoomController extends Controller
{
    public function __construct(
        private readonly GameRoomService $roomService
    ) {}

    /**
     * Handle the incoming request to start a new case session.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
        ]);

        $gameCase = GameCase::findOrFail($validated['case_id']);
        $host = $request->user();

        $result = $this->roomService->createRoom($gameCase, $host);
        
        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Room Creation Failed',
                'message' => $result->errorMessage
            ], 400);
        }

        return response()->json([
            'message' => 'Room created successfully',
            'room' => $result->value->load('currentLevel'),
        ], 201);
    }

    /**
     * Handle the incoming request to join an existing session.
     */
    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invite_code' => 'required|string',
        ]);

        $player = $request->user();

        $result = $this->roomService->joinRoom($validated['invite_code'], $player);
        
        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Join Failed',
                'message' => $result->errorMessage
            ], 404);
        }

        return response()->json([
            'message' => 'Successfully joined the room',
            'room' => $result->value,
        ], 200);
    }

    /**
     * Fetch the active state of a specific room, including the current level's puzzle data.
     */
    public function show(GameRoom $room): JsonResponse
    {
        $room->load([
            'host',
            'gameCase.levels.questions.choices',
            'gameCase.levels.evidences',
            'users.user', 
            'currentLevel.questions.choices',
            'unlockedEvidences',
            
            'votes' => function ($query) use ($room) {
                $query->whereHas('question', function ($q) use ($room) {
                    $q->where('level_id', $room->current_level_id);
                });
            }
        ]);

        return response()->json([
            'room' => $room,
        ], 200);
    }
}