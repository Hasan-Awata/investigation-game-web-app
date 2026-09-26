<?php

namespace App\Http\Controllers;

use App\Enums\LevelPresentationType;
use App\Events\LevelTransitioned;
use App\Events\LocationInspected;
use App\Http\Resources\EvidenceBoardResource;
use App\Models\Choice;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\Level;
use App\Models\RoomInspection;
use App\Services\GameRoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameRoomController extends Controller
{
    public function __construct(
        private readonly GameRoomService $roomService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
        ]);

        $gameCase = GameCase::findOrFail($validated['case_id']);
        $host = $request->user();

        $result = $this->roomService->createRoom($gameCase, $host);

        if ($result->isFailure()) {
            return response()->json(['error' => 'Room Creation Failed', 'message' => $result->errorMessage], 400);
        }

        return response()->json(['message' => 'Room created successfully', 'room' => $result->value->load('currentLevel')], 201);
    }

    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate(['invite_code' => 'required|string']);
        $player = $request->user();
        $result = $this->roomService->joinRoom($validated['invite_code'], $player);

        if ($result->isFailure()) {
            return response()->json(['error' => 'Join Failed', 'message' => $result->errorMessage], 404);
        }

        return response()->json(['message' => 'Successfully joined the room', 'room' => $result->value], 200);
    }

    public function leave(Request $request, GameRoom $room): JsonResponse
    {
        $player = $request->user();
        $result = $this->roomService->leaveRoom($room, $player);

        if ($result->isFailure()) {
            return response()->json(['error' => 'Disconnect Failed', 'message' => $result->errorMessage], 400);
        }

        return response()->json(['message' => $result->value['message']], 200);
    }

    public function startLevel(Request $request, GameRoom $room, Level $level): JsonResponse
    {
        // 1. Structural Guard: Location sweeps are persistent and stateless
        if ($level->presentation_type === LevelPresentationType::Location) {
            return response()->json([
                'error' => 'Invalid Action',
                'message' => 'Location environments are persistently accessible and do not require host authorization.',
            ], 400);
        }

        if ($request->user()->id !== $room->host_user_id) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Only the assigned Room Host can initiate a new encounter.'], 403);
        }

        if ($room->current_level_id !== null) {
            return response()->json(['error' => 'Conflict', 'message' => 'An investigation encounter is already active.'], 409);
        }

        if ($room->completedLevels()->where('level_id', $level->id)->exists()) {
            return response()->json(['error' => 'Conflict', 'message' => 'This encounter is already resolved.'], 409);
        }

        if ($level->required_request_id) {
            $hasRequirement = $room->completedRequests()->where('request_id', $level->required_request_id)->exists();

            if (! $hasRequirement) {
                $level->load('requiredRequest');
                $label = $level->requiredRequest ? $level->requiredRequest->request_type->label() : 'specific procedural request';

                return response()->json(['error' => 'Missing Prerequisite', 'message' => "We can't proceed without a ".$label.'.'], 403);
            }
        }

        $room->update(['current_level_id' => $level->id]);
        LevelTransitioned::dispatch($room);

        return response()->json(['message' => 'Encounter initiated.', 'room' => $room->load('currentLevel')], 200);
    }

    public function inspect(Request $request, GameRoom $room): JsonResponse
    {
        $validated = $request->validate([
            'choice_id' => 'required|exists:choices,id',
        ]);

        $choice = Choice::findOrFail($validated['choice_id']);
        $outcomes = $choice->outcomes ?? [];

        $isDeadEnd = empty($outcomes['unlock_evidence'])
            && empty($outcomes['unlock_levels'])
            && empty($outcomes['character_updates'])
            && empty($outcomes['next_question_id']);

        $inspection = RoomInspection::firstOrCreate([
            'room_id' => $room->id,
            'choice_id' => $choice->id,
        ], [
            'is_dead_end' => $isDeadEnd,
        ]);

        LocationInspected::dispatch($room, $inspection);

        return response()->json(['message' => 'Location point inspected.', 'inspection' => $inspection], 200);
    }

    public function show(GameRoom $room): JsonResponse
    {
        $room->load([
            'host',
            'gameCase.zones.levels.questions.choices',
            'gameCase.characters',
            'users.user',
            'currentLevel.questions.choices',
            'unlockedLevels',
            'completedLevels',
            'characters',
            'playedWiretaps',
            'votes',
            'inspections',
            'filedRequests',
        ]);

        $this->roomService->distributeLocationQuestions($room);

        // Only the ids are needed here, and only as an input to the filter
        // below. Loading the relation would serialize whole Evidence models -
        // content_payload included - into every room load.
        $unlockedEvidenceIds = $room->unlockedEvidences()->pluck('evidences.id');

        // 'assets' is eager loaded because the board resource reads each
        // evidence's thumbnail. Left lazy, every room load and every Reverb
        // broadcast costs one extra query per evidence on the board.
        $possessedEvidences = Evidence::query()
            ->with('assets')
            ->where('case_id', $room->case_id)
            ->where(function ($query) use ($unlockedEvidenceIds) {
                $query->where('is_initial', true)
                    ->orWhereIn('id', $unlockedEvidenceIds);
            })
            ->orderBy('order_index')
            ->get();

        $room->accumulated_evidences = EvidenceBoardResource::collection($possessedEvidences);

        // The frontend needs to know which evidence is already unlocked, but
        // not what is in it, so ids only.
        $room->unlocked_evidence_ids = $unlockedEvidenceIds->values()->all();

        // Pre-compile Unified Characters based on their initial state and dynamic room override
        $unlockedCharacterIds = $room->characters->where('pivot.is_unlocked', true)->pluck('id')->toArray();

        $room->accumulated_characters = $room->gameCase->characters->filter(function ($c) use ($unlockedCharacterIds) {
            return $c->is_initial || in_array($c->id, $unlockedCharacterIds);
        })->map(function ($c) use ($room) {
            $roomOverride = $room->characters->firstWhere('id', $c->id);
            $c->current_status = $roomOverride ? $roomOverride->pivot->status : $c->default_status->value;
            unset($c->is_guilty, $c->charge);

            return $c;
        })->values();

        return response()->json(['room' => $room], 200);
    }
}
