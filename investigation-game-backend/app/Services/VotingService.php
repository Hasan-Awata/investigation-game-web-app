<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Question;
use App\Models\Choice;
use App\Models\Character;
use App\Models\RoomVote;
use App\Models\User;
use App\Models\Evidence;
use App\Models\Level;
use Illuminate\Support\Facades\DB;
use App\Enums\RoomStatus;
use App\Support\Result;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Events\VoteLockedIn;
use App\Events\ItemsUnlocked;

class VotingService
{
    use BroadcastsAfterCommit;
    public function lockInVote(GameRoom $room, User $user, Question $question, Choice $choice): Result
    {
        return DB::transaction(function () use ($room, $user, $question, $choice) {
            $room = GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();

            if ($room->status !== RoomStatus::Active) {
                return Result::failure('This investigation has already concluded.');
            }

            if ($question->level_id !== $room->current_level_id) {
                return Result::failure("This verdict does not belong to the currently active level.");
            }

            if ($choice->question_id !== $question->id) {
                return Result::failure("Invalid choice for the given verdict.");
            }

            // Enforce Choice::requirements server-side
            $requirements = $choice->requirements;
            if ($requirements) {
                if (!empty($requirements['required_evidence'])) {
                    $possessedEvidenceIds = $room->getPossessedEvidenceIds();
                    if (array_diff($requirements['required_evidence'], $possessedEvidenceIds)) {
                        return Result::failure('You do not possess the required evidence to select this choice.');
                    }
                }
                if (!empty($requirements['required_choices'])) {
                    $votedChoiceIds = $room->votes()->where('user_id', $user->id)->pluck('choice_id')->toArray();
                    if (array_diff($requirements['required_choices'], $votedChoiceIds)) {
                        return Result::failure('Prerequisite choice was not selected in earlier questioning.');
                    }
                }
            }

            $vote = RoomVote::updateOrCreate(
                [
                    'room_id' => $room->id,
                    'user_id' => $user->id,
                    'question_id' => $question->id,
                ],
                [
                    'choice_id' => $choice->id,
                ]
            );

            $unlockedEvidences = collect();
            $unlockedLevels = collect();
            $appliedCharacterUpdates = [];

            $outcomes = $choice->outcomes ?? [];

            if (!empty($outcomes['unlock_evidence']) && is_array($outcomes['unlock_evidence'])) {
                $unlockedEvidences = Evidence::where('case_id', $room->case_id)
                    ->whereIn('id', $outcomes['unlock_evidence'])
                    ->get();
                if ($unlockedEvidences->isNotEmpty()) {
                    $room->unlockedEvidences()->syncWithoutDetaching($unlockedEvidences->pluck('id')->toArray());
                }
            }

            if (!empty($outcomes['unlock_levels']) && is_array($outcomes['unlock_levels'])) {
                $unlockedLevels = Level::whereHas('zone', fn ($q) => $q->where('case_id', $room->case_id))
                    ->whereIn('id', $outcomes['unlock_levels'])
                    ->get();
                if ($unlockedLevels->isNotEmpty()) {
                    $room->unlockedLevels()->syncWithoutDetaching($unlockedLevels->pluck('id')->toArray());
                }
            }

            if (!empty($outcomes['character_updates']) && is_array($outcomes['character_updates'])) {
                foreach ($outcomes['character_updates'] as $update) {
                    if (!isset($update['id'])) continue;

                    $character = Character::where('case_id', $room->case_id)->find($update['id']);
                    if (!$character) continue;

                    $dataToUpdate = [];
                    if (isset($update['status'])) $dataToUpdate['status'] = $update['status'];
                    if (isset($update['is_unlocked'])) $dataToUpdate['is_unlocked'] = $update['is_unlocked'];

                    if (empty($dataToUpdate)) continue;

                    $room->characters()->syncWithoutDetaching([
                        $character->id => $dataToUpdate,
                    ]);

                    $pivot = $room->characters()->where('characters.id', $character->id)->first()?->pivot;

                    $character->setAttribute('status', $pivot->status ?? $character->default_status->value);
                    $character->setAttribute('is_unlocked', (bool) ($pivot->is_unlocked ?? false));

                    $appliedCharacterUpdates[] = $character->makeHidden(['is_guilty', 'charge'])->toArray();
                }
            }

            $this->broadcastAfterCommit(new VoteLockedIn($room, $vote));

            if ($unlockedEvidences->isNotEmpty() || $unlockedLevels->isNotEmpty() || !empty($appliedCharacterUpdates)) {
                $this->broadcastAfterCommit(new ItemsUnlocked(
                    $room,
                    $unlockedEvidences->isNotEmpty() ? $unlockedEvidences : null,
                    $unlockedLevels->isNotEmpty() ? $unlockedLevels : null,
                    !empty($appliedCharacterUpdates) ? $appliedCharacterUpdates : null,
                    null
                ));
            }

            return Result::success([
                'vote' => $vote,
                'unlocked' => [
                    'evidence' => $unlockedEvidences->toArray(),
                    'levels' => $unlockedLevels->toArray(),
                    'character_updates' => $appliedCharacterUpdates
                ]
            ]);
        });
    }

    public function getQuestionConsensusChoiceId(GameRoom $room, int $questionId): ?int
    {
        $votes = $room->votes()->where('question_id', $questionId)->get();
        if ($votes->isEmpty()) {
            return null;
        }

        $weights = [];
        foreach ($votes as $vote) {
            $weight = ((int) $vote->user_id === (int) $room->host_user_id) ? 2 : 1;
            $choiceId = (int) $vote->choice_id;
            $weights[$choiceId] = ($weights[$choiceId] ?? 0) + $weight;
        }

        arsort($weights);
        $counts = array_values($weights);

        if (count($counts) > 1 && $counts[0] === $counts[1]) {
            return null;
        }

        return (int) array_key_first($weights);
    }
}