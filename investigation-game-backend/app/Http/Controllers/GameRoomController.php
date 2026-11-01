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
use App\Models\EncounterGroup;
use App\Services\EncounterGroupService;
use App\Services\LocationInspectionService;

class GameRoomController extends Controller
{
    use BroadcastsAfterCommit;
    public function __construct(
        private readonly GameRoomService $roomService,
        private readonly EncounterGroupService $encounterGroups,
        private readonly LocationInspectionService $locationInspections
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

        return response()->json(['message' => 'Room created successfully', 'room' => $result->value], 201);
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
        $validated = $request->validate(['reason' => 'sometimes|string|in:explicit,pagehide']);
        $player = $request->user();
        $result = $this->roomService->leaveRoom($room, $player, \App\Enums\RoomLeaveReason::from($validated['reason'] ?? 'explicit'));

        if ($result->isFailure()) {
            return response()->json(['error' => 'Disconnect Failed', 'message' => $result->errorMessage], 400);
        }

        return response()->json(['message' => $result->value['message']], 200);
    }

    public function startLevel(Request $request, GameRoom $room, Level $level): JsonResponse
    {
        $result = $this->encounterGroups->start($room, $level, $request->user());
        if ($result->isFailure()) {
            return response()->json(['error' => 'Start Failed', 'message' => $result->errorMessage], 422);
        }
        return response()->json(['message' => 'Encounter group started.', 'group' => $result->value], 201);
    }

    public function joinEncounterGroup(Request $request, GameRoom $room, EncounterGroup $group): JsonResponse
    {
        $result = $this->encounterGroups->join($room, $group, $request->user());
        if ($result->isFailure()) {
            return response()->json(['error' => 'Join Failed', 'message' => $result->errorMessage], 422);
        }
        return response()->json(['message' => 'Joined encounter group.', 'group' => $result->value], 200);
    }

    public function inspect(Request $request, GameRoom $room): JsonResponse
    {
        $validated = $request->validate([
            'choice_id' => 'required|exists:choices,id',
        ]);

        $result = $this->locationInspections->inspect($room, (int) $validated['choice_id'], $request->user());
        if ($result->isFailure()) return response()->json(['error' => 'Inspection Failed', 'message' => $result->errorMessage], 403);
        return response()->json(['message' => 'Location point inspected.', ...$result->value], 200);
    }

    public function show(GameRoom $room): JsonResponse
    {
        $room->load([
            'host',
            'gameCase.zones.levels.questions.choices',
            'users:id,room_id,user_id,role',
            'users.user:id,username,name,email,XP',
            'unlockedEvidences',
            'unlockedCharacters',
            'unlockedLevels:id',
            'completedLevels:id',
            'completedRequests',
            'encounterGroups.members' => fn ($query) => $query->whereNull('left_at')->with('user'),
            'encounterGroups.level',
            'encounterGroups.votes',
            'questionResolutions',
            'votes',
            'inspections',
            'filedRequests'
        ]);

        $room->encounterGroups->each(function (EncounterGroup $group): void {
            $voterIds = \Illuminate\Support\Facades\DB::table('encounter_question_voters')
                ->where('encounter_group_id', $group->id)
                ->where('question_id', $group->current_question_id)
                ->whereNull('left_at')
                ->pluck('user_id');
            $currentVotes = $group->votes->where('question_id', $group->current_question_id)->whereIn('user_id', $voterIds);
            $tally = [];
            foreach ($currentVotes as $vote) {
                $weight = (int) $vote->user_id === (int) $group->creator_user_id ? 2 : 1;
                $tally[$vote->choice_id] = ($tally[$vote->choice_id] ?? 0) + $weight;
            }
            $group->setAttribute('required_voter_ids', $voterIds->values());
            $group->setAttribute('tally', $tally);
        });

        $locationChoices = $room->gameCase?->zones?->flatMap->levels
            ->filter(fn (Level $level) => $level->presentation_type === LevelPresentationType::Location)
            ->flatMap(fn (Level $level) => $level->questions->flatMap->choices) ?? collect();
        $targetedPointIds = $room->gameCase?->zones?->flatMap->levels
            ->flatMap(fn (Level $level) => $level->questions->flatMap->choices)
            ->flatMap(fn (Choice $choice) => $choice->outcomes['unlock_location_points'] ?? [])->map(fn ($id) => (int) $id)->unique() ?? collect();
        $unlockedPointIds = \Illuminate\Support\Facades\DB::table('room_unlocked_location_points')
            ->where('room_id', $room->id)->pluck('choice_id')->map(fn ($id) => (int) $id);
        $room->setAttribute('available_location_point_ids', $locationChoices->pluck('id')
            ->filter(fn ($id) => !$targetedPointIds->contains((int) $id) || $unlockedPointIds->contains((int) $id))
            ->values());

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

        $choiceSets->each(function (Choice $choice) {
            $choice->setAttribute('next_question_id', $choice->outcomes['next_question_id'] ?? null);
            $choice->makeHidden(['outcomes']);
        });
    }
}
