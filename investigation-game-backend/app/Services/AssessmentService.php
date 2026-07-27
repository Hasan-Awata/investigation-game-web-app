<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Level;
use App\Models\Choice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Enums\RoomStatus;
use App\Support\Result;
use App\Events\LevelTransitioned;

class AssessmentService
{
    public function __construct(private readonly VotingService $votingService) {}

    /**
     * Evaluate the team's final locked-in batch submission for the current level.
     */
    public function evaluateSubmission(GameRoom $room): Result
    {
        return DB::transaction(function () use ($room) {
            $level = $room->currentLevel;
            $consensus = $this->votingService->calculateLevelConsensus($room, $level->id);
            $questionsCount = $level->questions()->count();

            // Ensure every question has a consensus before assessing
            if (count($consensus) !== $questionsCount) {
                return Result::failure("Not all verdicts have a locked-in consensus yet.");
            }

            // Cross-reference the consensus choices with the database to check correctness
            $correctChoicesCount = Choice::whereIn('id', array_values($consensus))
                ->where('is_correct', true)
                ->count();

            $isSuccess = ($correctChoicesCount === $questionsCount);

            if ($isSuccess) {
                $this->advanceToNextLevel($room, $level);
                return Result::success([
                    'status' => 'success', 
                    'message' => 'Verdict accepted. Moving to the next phase of the investigation.'
                ]);
            }

            return Result::success([
                'status' => 'failed', 
                'message' => 'The logic is flawed. The Persona hint system is now available for the Host.'
            ]);
        });
    }

    /**
     * Transition the room to the next sequential level or close the case.
     */
    private function advanceToNextLevel(GameRoom $room, Level $currentLevel): void
    {
        $nextLevel = Level::where('case_id', $room->case_id)
            ->where('order_index', '>', $currentLevel->order_index)
            ->orderBy('order_index', 'asc')
            ->first();

        if ($nextLevel) {
            $room->update(['current_level_id' => $nextLevel->id]);
        } else {
            // Case Solved: Flag room and update user histories
            $room->update(['status' => RoomStatus::Solved]);
            $this->markCaseSolvedForParticipants($room);
        }

        // Broadcast the transition (whether to a new level or case solved)
        LevelTransitioned::dispatch($room);
    }

    /**
     * Populate the UserCaseHistory and distribute the XP reward.
     */
    private function markCaseSolvedForParticipants(GameRoom $room): void
    {
        $userIds = $room->users()->pluck('user_id');
        $case = $room->gameCase;

        foreach ($userIds as $userId) {
            DB::table('case_user')->updateOrInsert(
                ['user_id' => $userId, 'case_id' => $case->id],
                ['status' => 'solved', 'completed_at' => now()]
            );

            User::where('id', $userId)->increment('XP', $case->XP_on_solve);
        }
    }
}