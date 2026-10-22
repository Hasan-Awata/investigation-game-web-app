<?php

namespace App\Services;

use App\Enums\LevelPresentationType;
use App\Models\Character;
use App\Models\Choice;
use App\Models\Evidence;
use App\Models\GameRoom;
use App\Models\Level;
use App\Models\RoomInspection;
use App\Models\RoomVote;
use App\Models\User;
use App\Models\EncounterGroupMember;
use App\Events\ItemsUnlocked;
use App\Events\LocationInspected;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Support\Result;
use Illuminate\Support\Facades\DB;

class LocationInspectionService
{
    use BroadcastsAfterCommit;

    public function inspect(GameRoom $room, int $choiceId, User $user): Result
    {
        return DB::transaction(function () use ($room, $choiceId, $user): Result {
            $room = GameRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();
            if (EncounterGroupMember::query()->where('user_id', $user->id)->whereNull('left_at')->exists()) {
                return Result::failure('Finish your active interrogation before inspecting a location.');
            }
            $choice = Choice::query()->with('question.level.zone')->find($choiceId);
            $level = $choice?->question?->level;
            if (!$choice || !$level || $level->presentation_type !== LevelPresentationType::Location
                || (int) $level->zone?->case_id !== (int) $room->case_id) {
                return Result::failure('This coordinate is not in an accessible location.');
            }
            if (!$room->isLevelUnlocked((int) $level->id)) return Result::failure('This location has not been discovered.');
            if ($level->required_request_id && !$room->completedRequests()->where('request_id', $level->required_request_id)->exists()) {
                return Result::failure('The required procedural request has not been completed.');
            }
            $requirements = $choice->requirements ?? [];
            if (array_diff($requirements['required_evidence'] ?? [], $room->getPossessedEvidenceIds())) {
                return Result::failure('You do not possess the evidence required to inspect this point.');
            }
            if (!empty($requirements['required_choices'])) {
                $priorChoiceIds = RoomVote::query()->where('room_id', $room->id)->where('user_id', $user->id)->pluck('choice_id')->all();
                if (array_diff($requirements['required_choices'], $priorChoiceIds)) {
                    return Result::failure('Prerequisite choice was not selected in earlier questioning.');
                }
            }
            $targetedPointIds = Choice::query()->whereHas('question.level.zone', fn ($query) => $query->where('case_id', $room->case_id))
                ->get(['id', 'outcomes'])->flatMap(fn (Choice $authorChoice) => $authorChoice->outcomes['unlock_location_points'] ?? [])->map(fn ($id) => (int) $id)->unique();
            if ($targetedPointIds->contains((int) $choice->id)
                && !DB::table('room_unlocked_location_points')->where('room_id', $room->id)->where('choice_id', $choice->id)->exists()) {
                return Result::failure('This coordinate is still hidden.');
            }
            $outcomes = $choice->outcomes ?? [];
            $isDeadEnd = empty($outcomes['unlock_evidence']) && empty($outcomes['unlock_levels'])
                && empty($outcomes['character_updates']) && empty($outcomes['unlock_location_points'])
                && empty($outcomes['next_question_id']);
            $inspection = RoomInspection::query()->firstOrCreate(
                ['room_id' => $room->id, 'choice_id' => $choice->id],
                ['is_dead_end' => $isDeadEnd]
            );
            if (!$inspection->wasRecentlyCreated) return Result::success(['inspection' => $inspection, 'duplicate' => true]);

            $evidence = collect();
            $levels = collect();
            $characters = [];
            $unlockedLocationPointIds = [];
            if (!empty($outcomes['unlock_evidence'])) {
                $evidence = Evidence::query()->where('case_id', $room->case_id)->whereIn('id', $outcomes['unlock_evidence'])->get();
                $room->unlockedEvidences()->syncWithoutDetaching($evidence->modelKeys());
            }
            if (!empty($outcomes['unlock_levels'])) {
                $levels = Level::query()->whereHas('zone', fn ($query) => $query->where('case_id', $room->case_id))->whereIn('id', $outcomes['unlock_levels'])->get();
                $room->unlockedLevels()->syncWithoutDetaching($levels->modelKeys());
            }
            foreach ($outcomes['unlock_location_points'] ?? [] as $targetChoiceId) {
                DB::table('room_unlocked_location_points')->insertOrIgnore(['room_id' => $room->id, 'choice_id' => $targetChoiceId, 'created_at' => now(), 'updated_at' => now()]);
                $unlockedLocationPointIds[] = (int) $targetChoiceId;
            }
            foreach ($outcomes['character_updates'] ?? [] as $update) {
                if (empty($update['id'])) continue;
                $character = Character::query()->where('case_id', $room->case_id)->find($update['id']);
                if (!$character) continue;
                $pivotData = array_intersect_key($update, array_flip(['status', 'is_unlocked']));
                if ($pivotData) {
                    $room->characters()->syncWithoutDetaching([$character->id => $pivotData]);
                    $characters[] = $update;
                }
            }
            $this->broadcastAfterCommit(new LocationInspected($room, $inspection));
            if ($evidence->isNotEmpty() || $levels->isNotEmpty() || $characters || $unlockedLocationPointIds) {
                $this->broadcastAfterCommit(new ItemsUnlocked($room, $evidence, $levels, $characters, null, $unlockedLocationPointIds));
            }
            return Result::success(['inspection' => $inspection, 'duplicate' => false]);
        });
    }
}
