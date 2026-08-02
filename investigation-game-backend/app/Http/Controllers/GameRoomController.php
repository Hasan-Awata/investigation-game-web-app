<?php

namespace App\Http\Controllers;

use App\Models\GameCase;
use App\Models\Level; 
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
    public function startLevel(Request $request, GameRoom $room, Level $level): JsonResponse
    {
        // NEW: Strict authorization gate - Host Only
        if ($request->user()->id !== $room->host_user_id) {
            return response()->json([
                'error' => 'Unauthorized', 
                'message' => 'Only the assigned Room Host can initiate a new phase.'
            ], 403);
        }

        if ($room->current_level_id !== null) {
            return response()->json(['error' => 'Conflict', 'message' => 'An investigation phase is already active.'], 409);
        }
        
        if ($room->completedLevels()->where('level_id', $level->id)->exists()) {
            return response()->json(['error' => 'Conflict', 'message' => 'This phase is already solved.'], 409);
        }

        $room->update(['current_level_id' => $level->id]);
        \App\Events\LevelTransitioned::dispatch($room);

        return response()->json([
            'message' => 'Phase initiated.',
            'room' => $room->load('currentLevel')
        ], 200);
    }

    public function show(GameRoom $room): JsonResponse
    {
        $room->load([
            'host',
            'gameCase.levels.questions.choices',
            'gameCase.evidences', 
            'users.user', 
            'currentLevel.questions.choices',
            'unlockedEvidences',
            'unlockedLevels', 
            'completedLevels',
            'votes' => function ($query) use ($room) {
                $query->whereHas('question', function ($q) use ($room) {
                    $q->where('level_id', $room->current_level_id);
                });
            }
        ]);

        return response()->json(['room' => $room], 200);
    }
}