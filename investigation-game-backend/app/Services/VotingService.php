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

        // Broadcast the real-time update to the rest of the room
        VoteLockedIn::dispatch($room, $vote);

        return Result::success($vote);
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
            // Retrieve the role to apply the correct vote weight
            $role = $participants->get($vote->user_id)?->role ?? 'participant';
            $weight = ($role === 'host') ? 2 : 1;

            $qId = $vote->question_id;
            $cId = $vote->choice_id;

            $tally[$qId][$cId] = ($tally[$qId][$cId] ?? 0) + $weight;
        }

        $consensus = [];
        foreach ($tally as $questionId => $choices) {
            // Sort choices descending by weight and pick the highest
            arsort($choices);
            $consensus[$questionId] = array_key_first($choices);
        }

        return $consensus;
    }
}