<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Question;
use App\Models\Choice;
use App\Models\RoomVote;
use App\Models\User;
use App\Support\Result;
use App\Events\VoteLockedIn;

class VotingService
{
    /**
     * Lock in or update a user's vote for a specific verdict.
     */
    public function lockInVote(GameRoom $room, User $user, Question $question, Choice $choice): Result
    {
        if ($question->level_id !== $room->current_level_id) {
            return Result::failure("This verdict does not belong to the currently active level.");
        }

        if ($choice->question_id !== $question->id) {
            return Result::failure("Invalid choice for the given verdict.");
        }

        // Upsert the vote
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

        // --- DYNAMIC NARRATIVE UNLOCKS VIA JSON PAYLOAD ---
        $unlocked = [
            'evidence' => [],
            'levels' => [],
            'suspects' => [],
            'victims' => []
        ];

        // Access the automatically casted JSON array
        $outcomes = $choice->outcomes ?? [];

        // Evidence Unlocks
        if (!empty($outcomes['unlock_evidence']) && is_array($outcomes['unlock_evidence'])) {
            // Check that the items exist to prevent ghost relations
            $validEvidence = \App\Models\Evidence::whereIn('id', $outcomes['unlock_evidence'])->pluck('id')->toArray();
            if (!empty($validEvidence)) {
                $room->unlockedEvidences()->syncWithoutDetaching($validEvidence);
                $unlocked['evidence'] = array_merge($unlocked['evidence'], $validEvidence);
                \App\Events\EvidenceDiscovered::dispatch($room, $validEvidence);
            }
        }

        // Level Unlocks
        if (!empty($outcomes['unlock_levels']) && is_array($outcomes['unlock_levels'])) {
            $validLevels = \App\Models\Level::whereIn('id', $outcomes['unlock_levels'])->pluck('id')->toArray();
            if (!empty($validLevels)) {
                $room->unlockedLevels()->syncWithoutDetaching($validLevels);
                $unlocked['levels'] = array_merge($unlocked['levels'], $validLevels);
            }
        }

        // Suspect Unlocks
        if (!empty($outcomes['unlock_suspects']) && is_array($outcomes['unlock_suspects'])) {
            $validSuspects = \App\Models\Suspect::whereIn('id', $outcomes['unlock_suspects'])->pluck('id')->toArray();
            if (!empty($validSuspects)) {
                $room->unlockedSuspects()->syncWithoutDetaching($validSuspects);
                $unlocked['suspects'] = array_merge($unlocked['suspects'], $validSuspects);
                \App\Events\SuspectDiscovered::dispatch($room, $validSuspects);
            }
        }

        // Victim Unlocks
        if (!empty($outcomes['unlock_victims']) && is_array($outcomes['unlock_victims'])) {
            $validVictims = \App\Models\Victim::whereIn('id', $outcomes['unlock_victims'])->pluck('id')->toArray();
            if (!empty($validVictims)) {
                $room->unlockedVictims()->syncWithoutDetaching($validVictims);
                $unlocked['victims'] = array_merge($unlocked['victims'], $validVictims);
                \App\Events\VictimDiscovered::dispatch($room, $validVictims);
            }
        }

        // Broadcast the real-time vote update
        VoteLockedIn::dispatch($room, $vote);

        return Result::success([
            'vote' => $vote,
            'unlocked' => $unlocked
        ]);
    }

    /**
     * Calculate the current consensus of the room based on weighted votes.
     */
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