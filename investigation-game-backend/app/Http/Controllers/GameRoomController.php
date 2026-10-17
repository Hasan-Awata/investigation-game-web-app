<?php

namespace App\Http\Controllers;

use App\Models\GameCase;
use App\Models\Level;
use App\Models\Question;
use App\Models\Choice;
use App\Models\RoomInspection;
use App\Enums\LevelPresentationType;
use App\Services\GameRoomService;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Events\LevelTransitioned;
use App\Events\LocationInspected;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\GameRoom;

class GameRoomController extends Controller
{
    use BroadcastsAfterCommit;
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
        if ($level->presentation_type === \App\Enums\LevelPresentationType::Location) {
            return response()->json([
                'error' => 'Invalid Action', 
                'message' => 'Location environments are persistently accessible and do not require host authorization.'
            ], 400);
        }

        if ($request->user()->id !== $room->host_user_id) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Only the assigned Room Host can initiate a new encounter.'], 403);
        }



        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $room, $level) {
            $room = \App\Models\GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();

            if ($room->status !== \App\Enums\RoomStatus::Active) {
                return response()->json(['error' => 'Invalid Action', 'message' => 'This investigation has already concluded.'], 400);
            }

            if ($room->current_level_id !== null) {
                return response()->json(['error' => 'Conflict', 'message' => 'An investigation encounter is already active.'], 409);
            }

            if ($room->completedLevels()->where('level_id', $level->id)->exists()) {
                return response()->json(['error' => 'Conflict', 'message' => 'This encounter is already resolved.'], 409);
            }

            $level->loadMissing('zone');
            if (!$level->zone || (int) $level->zone->case_id !== (int) $room->case_id) {
                return response()->json(['error' => 'Forbidden', 'message' => 'This level does not belong to the active case.'], 403);
            }

            if (!$room->isLevelUnlocked($level->id)) {
                return response()->json(['error' => 'Locked', 'message' => 'This level is still locked.'], 403);
            }

            if ($level->required_request_id) {
                $hasRequirement = $room->completedRequests()->where('request_id', $level->required_request_id)->exists();

                if (!$hasRequirement) {
                    $level->load('requiredRequest');
                    $label = $level->requiredRequest ? $level->requiredRequest->request_type->label() : 'specific procedural request';
                    return response()->json(['error' => 'Missing Prerequisite', 'message' => "We can't proceed without a " . $label . "."], 403);
                }
            }

            $room->update(['current_level_id' => $level->id]);
            $this->broadcastAfterCommit(new LevelTransitioned($room));

            return response()->json(['message' => 'Encounter initiated.', 'room' => $room->load('currentLevel')], 200);
        });

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
            'choice_id' => $choice->id
        ], [
            'is_dead_end' => $isDeadEnd
        ]);

        $this->broadcastAfterCommit(new LocationInspected($room, $inspection));

        return response()->json(['message' => 'Location point inspected.', 'inspection' => $inspection], 200);
    }

    public function show(GameRoom $room): JsonResponse
    {
        $room->load([
            'host',
            'gameCase.zones.levels.questions.choices',
            'users:id,room_id,user_id,role',
            'users.user:id,username,name,email,XP',
            'currentLevel.questions.choices',
            'unlockedEvidences',
            'unlockedCharacters',
            'unlockedLevels:id',
            'completedLevels:id',
            'completedRequests',
            'playedWiretaps',
            'votes',
            'inspections',
            'filedRequests'
        ]);

        // Location assignment is a pure data transform: compute the map, then
        // overlay it onto the response payload. Nothing is persisted here.
        $locationAssignments = $this->roomService->distributeLocationQuestions($room);
        $this->decorateLocationAssignments($room, $locationAssignments);

        // Strip the answer key from every player-facing choice. Only the
        // dialogue-tree link and the requirement gate are safe to expose.
        $this->sanitizePlayerChoices($room);

        // Pre-compile evidences strictly from the room's seeded runtime pivot state.
        $room->setAttribute('accumulated_evidences', $room->unlockedEvidences->values()->map(
            fn ($evidence) => $evidence->makeHidden(['is_vital_for_conviction'])
        ));

        // Pre-compile characters from pivot unlock state, overlaying pivot status.
        $room->setAttribute(
            'accumulated_characters',
            $room->unlockedCharacters->map(function ($character) {
                $status = $character->pivot->status;
                $character->setAttribute('status', $status);
                $character->setAttribute('current_status', $status);
                $character->setAttribute('is_unlocked', (bool) $character->pivot->is_unlocked);
                return $character->makeHidden(['is_guilty', 'charge', 'pivot']);
            })->values()
        );

        // The raw pivot relations carry the same (unsanitized) rows; drop them
        // so the payload cannot leak the answer key through a second path.
        $room->unsetRelation('unlockedEvidences');
        $room->unsetRelation('unlockedCharacters');

        return response()->json(['room' => $room], 200);
    }

    /**
     * Overlays the deterministic location-question assignment onto the models
     * that are about to be serialized. Runs only on already-loaded models and
     * is never persisted — it is response formatting, not domain mutation.
     */
    private function decorateLocationAssignments(GameRoom $room, array $assignmentByQuestionId): void
    {
        if (empty($assignmentByQuestionId)) {
            return;
        }

        $apply = function ($question) use ($assignmentByQuestionId) {
            if ($question instanceof Question && isset($assignmentByQuestionId[$question->id])) {
                $question->setAttribute('assigned_user_id', $assignmentByQuestionId[$question->id]);
            }
        };

        $room->gameCase?->zones
            ->flatMap->levels
            ->flatMap->questions
            ->each($apply);

        $room->currentLevel?->questions->each($apply);
    }

    /**
     * Hides `Choice.outcomes` from a player payload while preserving the
     * narrative link (`next_question_id`) and the narrative gate
     * (`requirements`) that the client needs to render the flow.
     */
    private function sanitizePlayerChoices(GameRoom $room): void
    {
        $choiceSets = collect();

        if ($room->gameCase) {
            $choiceSets = $room->gameCase->zones
                ->flatMap->levels
                ->flatMap->questions
                ->flatMap->choices;
        }

        if ($room->currentLevel) {
            $choiceSets = $choiceSets->concat(
                $room->currentLevel->questions->flatMap->choices
            );
        }

        $choiceSets->each(function (Choice $choice) {
            $choice->setAttribute('next_question_id', $choice->outcomes['next_question_id'] ?? null);
            $choice->makeHidden(['outcomes']);
        });
    }
}