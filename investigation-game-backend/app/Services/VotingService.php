<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Question;
use App\Models\Choice;
use App\Models\RoomVote;
use App\Models\User;
use App\Models\Evidence;
use App\Models\Level;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Events\VoteLockedIn;
use App\Events\ItemsUnlocked;

class VotingService
{
    public function lockInVote(GameRoom $room, User $user, Question $question, Choice $choice): Result
    {
        if ($question->level_id !== $room->current_level_id) {
            return Result::failure("This verdict does not belong to the currently active level.");
        }

        if ($choice->question_id !== $question->id) {
            return Result::failure("Invalid choice for the given verdict.");
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
            $unlockedEvidences = Evidence::whereIn('id', $outcomes['unlock_evidence'])->get();
            if ($unlockedEvidences->isNotEmpty()) {
                $room->unlockedEvidences()->syncWithoutDetaching($unlockedEvidences->pluck('id')->toArray());
            }
        }

        if (!empty($outcomes['unlock_levels']) && is_array($outcomes['unlock_levels'])) {
            $unlockedLevels = Level::whereIn('id', $outcomes['unlock_levels'])->get();
            if ($unlockedLevels->isNotEmpty()) {
                $room->unlockedLevels()->syncWithoutDetaching($unlockedLevels->pluck('id')->toArray());
            }
        }

        if (!empty($outcomes['character_updates']) && is_array($outcomes['character_updates'])) {
            foreach ($outcomes['character_updates'] as $update) {
                if (!isset($update['id'])) continue;

                $dataToUpdate = [];
                if (isset($update['status'])) $dataToUpdate['status'] = $update['status'];
                if (isset($update['is_unlocked'])) $dataToUpdate['is_unlocked'] = $update['is_unlocked'];

                if (!empty($dataToUpdate)) {
                    $room->characters()->syncWithoutDetaching([
                        $update['id'] => $dataToUpdate
                    ]);
                    
                    $appliedCharacterUpdates[] = array_merge(['character_id' => $update['id']], $dataToUpdate);
                }
            }
        }

        VoteLockedIn::dispatch($room, $vote);

        if ($unlockedEvidences->isNotEmpty() || $unlockedLevels->isNotEmpty() || !empty($appliedCharacterUpdates)) {
            ItemsUnlocked::dispatch(
                $room,
                $unlockedEvidences->isNotEmpty() ? $unlockedEvidences : null,
                $unlockedLevels->isNotEmpty() ? $unlockedLevels : null,
                !empty($appliedCharacterUpdates) ? $appliedCharacterUpdates : null,
                null
            );
        }

        return Result::success([
            'vote' => $vote,
            'unlocked' => [
                'evidence' => $unlockedEvidences->toArray(),
                'levels' => $unlockedLevels->toArray(),
                'character_updates' => $appliedCharacterUpdates
            ]
        ]);
    }

    public function calculateLevelConsensus(GameRoom $room, int $levelId): array
    {
        $votes = RoomVote::where('room_id', $room->id)
            ->whereHas('question', fn($q) => $q->where('level_id', $levelId))
            ->get();

        $tally = [];
        $participants = $room->users->keyBy('user_id');

        foreach ($votes as $vote) {
            $role = $participants->get($vote->user_id)?->role ?? 'participant';
            $weight = ($role === 'host') ? 2 : 1;

            $qId = $vote->question_id;
            $cId = $vote->choice_id;

            $tally[$qId][$cId] = ($tally[$qId][$cId] ?? 0) + $weight;
        }

        $consensus = [];
        foreach ($tally as $questionId => $choices) {
            arsort($choices);
            $consensus[$questionId] = array_key_first($choices);
        }

        return $consensus;
    }
}