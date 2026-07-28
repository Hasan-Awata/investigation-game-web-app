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
            
            // Separate the questions
            $mandatoryQuestions = $level->questions()->where('is_mandatory', true)->get();
            $optionalQuestions = $level->questions()->where('is_mandatory', false)->get();

            // 1. Check Mandatory Progression
            foreach ($mandatoryQuestions as $question) {
                if (!isset($consensus[$question->id])) {
                    return Result::failure("Not all mandatory verdicts have a locked-in consensus yet.");
                }

                $chosenId = $consensus[$question->id];
                $isCorrect = Choice::where('id', $chosenId)->value('is_correct');

                if (!$isCorrect) {
                    return Result::success([
                        'status' => 'failed', 
                        'message' => 'The logic on a critical verdict is flawed. The Persona hint system is now available.'
                    ]);
                }
            }

            // 2. Process Optional Narrative Choices (Only runs if mandatory questions are correct)
            $newlyUnlockedEvidences = [];
            foreach ($optionalQuestions as $question) {
                if (isset($consensus[$question->id])) {
                    $chosenId = $consensus[$question->id];
                    $choice = Choice::find($chosenId);

                    // If the narrative choice yields evidence, add it to the room's inventory
                    if ($choice && $choice->unlocks_evidence_id) {
                        DB::table('room_evidences')->updateOrInsert([
                            'room_id' => $room->id,
                            'evidence_id' => $choice->unlocks_evidence_id
                        ]);
                        $newlyUnlockedEvidences[] = $choice->unlocks_evidence_id;
                    }
                }
            }

            // 3. Dispatch Real-Time Event for the New Evidence
            if (!empty($newlyUnlockedEvidences)) {
                \App\Events\EvidenceDiscovered::dispatch($room, $newlyUnlockedEvidences);
            }

            $this->advanceToNextLevel($room, $level);
            
            return Result::success([
                'status' => 'success', 
                'message' => 'Verdict accepted. Moving to the next phase of the investigation.',
                'unlocked_evidence' => $newlyUnlockedEvidences 
            ]);

            $this->advanceToNextLevel($room, $level);
            
            return Result::success([
                'status' => 'success', 
                'message' => 'Verdict accepted. Moving to the next phase of the investigation.'
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