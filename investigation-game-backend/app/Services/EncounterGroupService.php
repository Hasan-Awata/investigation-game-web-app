<?php

namespace App\Services;

use App\Enums\LevelPresentationType;
use App\Enums\RoomStatus;
use App\Models\EncounterGroup;
use App\Models\EncounterGroupMember;
use App\Models\GameRoom;
use App\Models\Level;
use App\Models\Question;
use App\Models\RoomVote;
use App\Models\User;
use App\Models\Choice;
use App\Models\Evidence;
use App\Models\Character;
use App\Jobs\FinalizeEncounterQuestion;
use App\Events\EncounterGroupUpdated;
use App\Events\ItemsUnlocked;
use App\Events\LevelTransitioned;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Support\Result;
use Illuminate\Support\Facades\DB;

class EncounterGroupService
{
    use BroadcastsAfterCommit;

    public function start(GameRoom $room, Level $level, User $user): Result
    {
        return DB::transaction(function () use ($room, $level, $user): Result {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $room = GameRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();
            $level = Level::query()->with('zone')->whereKey($level->id)->firstOrFail();

            if ($room->status !== RoomStatus::Active || !$room->isParticipant((int) $user->id)) {
                return Result::failure('You cannot start an encounter in this room.');
            }
            if ($level->presentation_type !== LevelPresentationType::Interrogation || (int) $level->zone?->case_id !== (int) $room->case_id) {
                return Result::failure('This level is not an interrogation in the active case.');
            }
            if (!$room->isLevelUnlocked((int) $level->id) || $room->completedLevels()->whereKey($level->id)->exists()) {
                return Result::failure('This interrogation is unavailable.');
            }
            if ($level->required_request_id && !$room->completedRequests()->where('request_id', $level->required_request_id)->exists()) {
                return Result::failure('The required procedural request has not been completed.');
            }
            if (EncounterGroupMember::query()->where('user_id', $user->id)->whereNull('left_at')->exists()) {
                return Result::failure('Leave your current encounter before starting another.');
            }
            if (EncounterGroup::query()->where('room_id', $room->id)->where('level_id', $level->id)->where('status', 'active')->exists()) {
                return Result::failure('An active group already exists; join it explicitly.');
            }

            $question = $this->nextUnresolvedQuestion($room, $level);
            if (!$question) {
                return Result::failure('This interrogation has no unresolved question.');
            }

            $group = EncounterGroup::query()->create([
                'room_id' => $room->id,
                'level_id' => $level->id,
                'creator_user_id' => $user->id,
                'active_room_id' => $room->id,
                'active_level_id' => $level->id,
                'status' => 'active',
                'current_question_id' => $question->id,
            ]);
            $this->addMember($group, $user);
            DB::table('encounter_question_voters')->insert([
                'encounter_group_id' => $group->id,
                'question_id' => $question->id,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $group = $this->loadActiveMembers($group);
            $this->broadcastAfterCommit(new EncounterGroupUpdated($group));
            return Result::success($group);
        });
    }

    public function join(GameRoom $room, EncounterGroup $group, User $user): Result
    {
        return DB::transaction(function () use ($room, $group, $user): Result {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $room = GameRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();
            $group = EncounterGroup::query()->whereKey($group->id)->lockForUpdate()->firstOrFail();
            if ($room->status !== RoomStatus::Active || (int) $group->room_id !== (int) $room->id || $group->status !== 'active' || !$room->isParticipant((int) $user->id)) {
                return Result::failure('This encounter group is unavailable.');
            }
            if (EncounterGroupMember::query()->where('user_id', $user->id)->whereNull('left_at')->exists()) {
                return Result::failure('You are already in an active encounter.');
            }
            $this->addMember($group, $user);
            $group = $this->loadActiveMembers($group);
            $this->broadcastAfterCommit(new EncounterGroupUpdated($group));
            return Result::success($group);
        });
    }

    public function vote(GameRoom $room, Question $question, int $choiceId, User $user): Result
    {
        return $this->updateVote($room, $question, $user, $choiceId);
    }

    public function clearVote(GameRoom $room, Question $question, User $user): Result
    {
        return $this->updateVote($room, $question, $user, null);
    }

    private function updateVote(GameRoom $room, Question $question, User $user, ?int $choiceId): Result
    {
        return DB::transaction(function () use ($room, $question, $user, $choiceId): Result {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $room = GameRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();
            if ($room->status !== RoomStatus::Active) {
                return Result::failure('This investigation is no longer active.');
            }
            $membership = EncounterGroupMember::query()->where('user_id', $user->id)->whereNull('left_at')->first();
            if (!$membership) return Result::failure('You are not in an active encounter group.');
            $group = EncounterGroup::query()->whereKey($membership->encounter_group_id)->lockForUpdate()->firstOrFail();
            if ((int) $group->room_id !== (int) $room->id || (int) $group->current_question_id !== (int) $question->id || (int) $question->level_id !== (int) $group->level_id) {
                return Result::failure('This question is not open for your group.');
            }
            if ($room->questionResolutions()->where('level_id', $group->level_id)->where('question_id', $question->id)->exists()) {
                return Result::failure('This question has already been resolved.');
            }
            $isRequiredVoter = DB::table('encounter_question_voters')
                ->where('encounter_group_id', $group->id)
                ->where('question_id', $question->id)
                ->where('user_id', $user->id)
                ->whereNull('left_at')
                ->exists();
            if (!$isRequiredVoter) return Result::failure('You will vote starting with the next question.');
            $existing = RoomVote::query()->where('encounter_group_id', $group->id)->where('question_id', $question->id)->where('user_id', $user->id)->first();
            if ($choiceId === null) {
                if (!$existing) return Result::success(['group' => $group, 'vote' => null, 'unchanged' => true]);
                $existing?->delete();
            } else {
                $choice = $question->choices()->whereKey($choiceId)->first();
                if (!$choice) return Result::failure('The selected choice does not belong to this question.');
                if ((int) $existing?->choice_id === $choiceId) {
                    return Result::success(['group' => $group, 'vote' => $existing, 'unchanged' => true]);
                }
                $requirements = $choice->requirements ?? [];
                $possessedEvidenceIds = $room->getPossessedEvidenceIds();
                if (array_diff($requirements['required_evidence'] ?? [], $possessedEvidenceIds)) {
                    return Result::failure('You do not possess the required evidence to select this choice.');
                }
                if (!empty($requirements['required_choices'])) {
                    $priorChoiceIds = RoomVote::query()->where('room_id', $room->id)->where('user_id', $user->id)->pluck('choice_id')->all();
                    if (array_diff($requirements['required_choices'], $priorChoiceIds)) {
                        return Result::failure('Prerequisite choice was not selected in earlier questioning.');
                    }
                }
                $existing = RoomVote::query()->updateOrCreate(
                    ['encounter_group_id' => $group->id, 'question_id' => $question->id, 'user_id' => $user->id],
                    ['room_id' => $room->id, 'choice_id' => $choiceId]
                );
            }
            $group->finalizes_at = $this->readyToFinalize($group, $question) ? now()->addSeconds(5) : null;
            $group->save();
            $group = $group->fresh();
            $this->broadcastAfterCommit(new EncounterGroupUpdated($group));
            if ($group->finalizes_at) {
                $deadline = $group->finalizes_at->toISOString();
                DB::afterCommit(fn () => FinalizeEncounterQuestion::dispatch($group->id, $question->id, $deadline)->delay($group->finalizes_at));
            }
            return Result::success(['group' => $group, 'vote' => $existing?->fresh()]);
        });
    }

    public function membershipDeparted(EncounterGroup $group): void
    {
        if ($group->status !== 'active' || !$group->current_question_id) {
            $this->broadcastAfterCommit(new EncounterGroupUpdated($group->fresh()));
            return;
        }
        $question = Question::query()->find($group->current_question_id);
        if (!$question) return;
        $group->finalizes_at = $this->readyToFinalize($group, $question) ? now()->addSeconds(5) : null;
        $group->save();
        $group->refresh();
        $this->broadcastAfterCommit(new EncounterGroupUpdated($group));
        if ($group->finalizes_at) {
            $deadline = $group->finalizes_at->toISOString();
            DB::afterCommit(fn () => FinalizeEncounterQuestion::dispatch($group->id, $question->id, $deadline)->delay($group->finalizes_at));
        }
    }

    public function finalize(EncounterGroup $candidate, int $questionId, string $deadline): void
    {
        DB::transaction(function () use ($candidate, $questionId, $deadline): void {
            // Room first matches leaveRoom's lock order and prevents a room/group deadlock.
            $room = GameRoom::query()->whereKey($candidate->room_id)->lockForUpdate()->first();
            if (!$room || $room->status !== RoomStatus::Active) return;
            $group = EncounterGroup::query()->whereKey($candidate->id)->lockForUpdate()->first();
            if (!$group || $group->status !== 'active' || (int) $group->current_question_id !== $questionId) return;
            if (!$group->finalizes_at || $group->finalizes_at->toISOString() !== $deadline || $group->finalizes_at->isFuture()) return;
            if ((int) $group->room_id !== (int) $room->id) return;
            $question = Question::query()->whereKey($questionId)->firstOrFail();
            if (!$this->readyToFinalize($group, $question)) {
                $group->update(['finalizes_at' => null]);
                return;
            }
            if ($room->questionResolutions()->where('level_id', $group->level_id)->where('question_id', $questionId)->exists()) return;
            $choiceId = $this->winningChoiceId($group, $question);
            if (!$choiceId) return;
            $choice = Choice::query()->whereKey($choiceId)->firstOrFail();
            $room->questionResolutions()->create([
                'level_id' => $group->level_id,
                'question_id' => $question->id,
                'choice_id' => $choice->id,
                'encounter_group_id' => $group->id,
                'resolved_at' => now(),
            ]);
            $this->applyChoiceOutcome($room, $group, $choice);
        });
    }

    private function readyToFinalize(EncounterGroup $group, Question $question): bool
    {
        $required = DB::table('encounter_question_voters')->where('encounter_group_id', $group->id)->where('question_id', $question->id)->whereNull('left_at')->pluck('user_id');
        if ($required->isEmpty()) return false;
        $votes = $group->votes()->where('question_id', $question->id)->whereIn('user_id', $required)->get();
        return $votes->count() === $required->count() && $this->winningChoiceId($group, $question) !== null;
    }

    private function winningChoiceId(EncounterGroup $group, Question $question): ?int
    {
        $requiredIds = DB::table('encounter_question_voters')->where('encounter_group_id', $group->id)->where('question_id', $question->id)->whereNull('left_at')->pluck('user_id');
        $weights = [];
        foreach ($group->votes()->where('question_id', $question->id)->whereIn('user_id', $requiredIds)->get() as $vote) {
            $weight = (int) $vote->user_id === (int) $group->creator_user_id ? 2 : 1;
            $weights[(int) $vote->choice_id] = ($weights[(int) $vote->choice_id] ?? 0) + $weight;
        }
        if (!$weights) return null;
        arsort($weights);
        $counts = array_values($weights);
        return count($counts) > 1 && $counts[0] === $counts[1] ? null : (int) array_key_first($weights);
    }

    private function applyChoiceOutcome(GameRoom $room, EncounterGroup $group, Choice $choice): void
    {
        $outcomes = $choice->outcomes ?? [];
        $evidence = collect();
        $levels = collect();
        $characterUpdates = [];
        $unlockedLocationPointIds = [];
        if (!empty($outcomes['unlock_evidence'])) {
            $evidence = Evidence::query()->where('case_id', $room->case_id)->whereIn('id', $outcomes['unlock_evidence'])->get();
            $room->unlockedEvidences()->syncWithoutDetaching($evidence->modelKeys());
        }
        if (!empty($outcomes['unlock_levels'])) {
            $levels = Level::query()->whereHas('zone', fn ($query) => $query->where('case_id', $room->case_id))->whereIn('id', $outcomes['unlock_levels'])->get();
            $room->unlockedLevels()->syncWithoutDetaching($levels->modelKeys());
        }
        if (!empty($outcomes['unlock_location_points'])) {
            foreach ($outcomes['unlock_location_points'] as $targetChoiceId) {
                DB::table('room_unlocked_location_points')->insertOrIgnore(['room_id' => $room->id, 'choice_id' => $targetChoiceId, 'created_at' => now(), 'updated_at' => now()]);
                $unlockedLocationPointIds[] = (int) $targetChoiceId;
            }
        }
        foreach ($outcomes['character_updates'] ?? [] as $update) {
            if (empty($update['id'])) continue;
            $character = Character::query()->where('case_id', $room->case_id)->find($update['id']);
            if (!$character) continue;
            $pivotUpdate = array_intersect_key($update, array_flip(['status', 'is_unlocked']));
            if (!$pivotUpdate) continue;
            $room->characters()->syncWithoutDetaching([$character->id => $pivotUpdate]);
            $characterUpdates[] = $update;
        }
        if ($evidence->isNotEmpty() || $levels->isNotEmpty() || $characterUpdates || $unlockedLocationPointIds) {
            $this->broadcastAfterCommit(new ItemsUnlocked($room, $evidence, $levels, $characterUpdates, null, $unlockedLocationPointIds));
        }
        if (filter_var($outcomes['gives_strike'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $room->increment('strikes');
            $room->refresh();
            if ($room->strikes >= $room->gameCase->max_strikes) {
                $activeGroups = EncounterGroup::query()->where('room_id', $room->id)->where('status', 'active')->get();
                foreach ($activeGroups as $activeGroup) {
                    $this->releaseActiveMembers($activeGroup);
                    $activeGroup->update([
                        'status' => 'failed',
                        'active_room_id' => null,
                        'active_level_id' => null,
                        'completed_at' => now(),
                        'finalizes_at' => null,
                    ]);
                    $this->broadcastAfterCommit(new EncounterGroupUpdated($activeGroup->fresh()));
                }
                app(AssessmentService::class)->failFromEncounterStrikes($room);
                return;
            }
        }
        $nextQuestionId = $outcomes['next_question_id'] ?? null;
        $nextQuestion = $nextQuestionId ? Question::query()->where('level_id', $group->level_id)->find($nextQuestionId) : null;
        if ($nextQuestion) {
            $group->update(['current_question_id' => $nextQuestion->id, 'finalizes_at' => null]);
            $memberIds = $group->members()->whereNull('left_at')->distinct()->pluck('user_id');
            foreach ($memberIds as $memberId) {
                DB::table('encounter_question_voters')->updateOrInsert(
                    ['encounter_group_id' => $group->id, 'question_id' => $nextQuestion->id, 'user_id' => $memberId],
                    ['left_at' => null, 'updated_at' => now(), 'created_at' => now()]
                );
            }
            $this->broadcastAfterCommit(new EncounterGroupUpdated($group->fresh()));
            return;
        }
        $room->completedLevels()->syncWithoutDetaching([$group->level_id]);
        $this->releaseActiveMembers($group);
        $group->update(['status' => 'completed', 'active_room_id' => null, 'active_level_id' => null, 'completed_at' => now(), 'current_question_id' => null, 'finalizes_at' => null]);
        $this->broadcastAfterCommit(new EncounterGroupUpdated($group->fresh()));
        $this->broadcastAfterCommit(new LevelTransitioned($room));
    }

    private function nextUnresolvedQuestion(GameRoom $room, Level $level): ?Question
    {
        $question = $level->questions()->orderBy('order_index')->orderBy('id')->first();
        $visited = [];
        while ($question && !isset($visited[$question->id])) {
            $visited[$question->id] = true;
            $resolution = $room->questionResolutions()
                ->where('level_id', $level->id)
                ->where('question_id', $question->id)
                ->first();
            if (!$resolution) return $question;

            $choice = Choice::query()->find($resolution->choice_id);
            $nextQuestionId = $choice?->outcomes['next_question_id'] ?? null;
            if (!$nextQuestionId) return null;
            $question = $level->questions()->whereKey($nextQuestionId)->first();
        }

        return null;
    }

    private function addMember(EncounterGroup $group, User $user): void
    {
        EncounterGroupMember::query()->create([
            'encounter_group_id' => $group->id,
            'user_id' => $user->id,
            'active_user_id' => $user->id,
            'joined_at' => now(),
        ]);
    }

    private function loadActiveMembers(EncounterGroup $group): EncounterGroup
    {
        $group->setRelation('members', $group->members()->whereNull('left_at')->with('user')->get());
        return $group->load('level');
    }

    private function releaseActiveMembers(EncounterGroup $group): void
    {
        $departedAt = now();
        $userIds = $group->members()->whereNull('left_at')->pluck('user_id');
        if ($userIds->isEmpty()) return;

        $group->members()->whereNull('left_at')->update([
            'left_at' => $departedAt,
            'active_user_id' => null,
            'updated_at' => $departedAt,
        ]);
        DB::table('encounter_question_voters')
            ->where('encounter_group_id', $group->id)
            ->whereIn('user_id', $userIds)
            ->whereNull('left_at')
            ->update(['left_at' => $departedAt, 'updated_at' => $departedAt]);
    }
}
