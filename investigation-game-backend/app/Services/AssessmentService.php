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
            
            $mandatoryQuestions = $level->questions()->where('is_mandatory', true)->get();
            $optionalQuestions = $level->questions()->where('is_mandatory', false)->get();

// 1. Check Mandatory Progression
            foreach ($mandatoryQuestions as $question) {
                if (!isset($consensus[$question->id])) {
                    return Result::failure("Not all mandatory verdicts have a locked-in consensus yet.");
                }

                $chosenId = $consensus[$question->id];
                $isCorrect = Choice::where('id', $chosenId)->value('is_correct');
                
                $maxStrikes = $room->gameCase->max_strikes; // <-- Retrieve dynamic limit

                // IF THEY SUBMIT THE WRONG ANSWER
                if (!$isCorrect) {
                    $room->increment('strikes');
                    $room->refresh();

                    // IF THEY HIT THE MAXIMUM STRIKES (THE POINT OF NO RETURN)
                    if ($room->strikes >= $maxStrikes) { // <-- Use dynamic limit
                        $room->update(['status' => \App\Enums\RoomStatus::Failed]);
                        $this->finalizeCaseForParticipants($room, 'failed');
                        \App\Events\LevelTransitioned::dispatch($room);

                        return Result::success([
                            'status' => 'failed_final', 
                            'message' => 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.'
                        ]);
                    }

                    // IF THEY STILL HAVE STRIKES LEFT
                    return Result::success([
                        'status' => 'failed', 
                        'message' => "The logic on a critical verdict is flawed. STRIKE {$room->strikes}/{$maxStrikes} LOGGED. The Persona hint system is active."
                    ]);
                }
            }

            // 2. Process Optional Narrative Choices
            $newlyUnlockedEvidences = [];
            foreach ($optionalQuestions as $question) {
                if (isset($consensus[$question->id])) {
                    $chosenId = $consensus[$question->id];
                    $choice = Choice::find($chosenId);

                    if ($choice && $choice->unlocks_evidence_id) {
                        DB::table('room_evidences')->updateOrInsert([
                            'room_id' => $room->id,
                            'evidence_id' => $choice->unlocks_evidence_id
                        ]);
                        $newlyUnlockedEvidences[] = $choice->unlocks_evidence_id;
                    }
                }
            }

            if (!empty($newlyUnlockedEvidences)) {
                \App\Events\EvidenceDiscovered::dispatch($room, $newlyUnlockedEvidences);
            }

            // 3. Advance or Successfully Close the Case
            $nextLevel = Level::where('case_id', $room->case_id)
                ->where('order_index', '>', $level->order_index)
                ->orderBy('order_index', 'asc')
                ->first();

            if ($nextLevel) {
                $room->update(['current_level_id' => $nextLevel->id]);
            } else {
                $room->update(['status' => \App\Enums\RoomStatus::Solved]);
                $this->finalizeCaseForParticipants($room, 'solved');
            }

            \App\Events\LevelTransitioned::dispatch($room);
            
            return Result::success([
                'status' => 'success', 
                'message' => 'Verdict accepted. Moving to the next phase of the investigation.',
                'unlocked_evidence' => $newlyUnlockedEvidences 
            ]);
        });
    }

    /**
     * Populate the case_user history and distribute XP dynamically.
     */
    private function finalizeCaseForParticipants(GameRoom $room, string $finalStatus): void
    {
        $userIds = $room->users()->pluck('user_id');
        $case = $room->gameCase;

        foreach ($userIds as $userId) {
            // Check the player's personal history with this dossier
            $existingRecord = DB::table('case_user')
                ->where('user_id', $userId)
                ->where('case_id', $case->id)
                ->first();

            $previousStatus = $existingRecord->status ?? null;

            // 1. Calculate XP Payload
            if ($finalStatus === 'solved') {
                $xpGained = 0;
                
                if ($previousStatus === 'solved') {
                    $xpGained = 0; // Replay: 0% XP
                } elseif ($previousStatus === 'failed') {
                    $xpGained = (int) floor($case->XP_on_solve / 2); // Redemption: 50% XP
                } else {
                    $xpGained = $case->XP_on_solve; // First time: 100% XP
                }

                if ($xpGained > 0) {
                    \App\Models\User::where('id', $userId)->increment('XP', $xpGained);
                }
            }

            // 2. Preserve or Update State
            if ($previousStatus === 'solved') {
                // Never downgrade a successful conviction. Just update the timestamp.
                DB::table('case_user')
                    ->where('id', $existingRecord->id)
                    ->update(['completed_at' => now()]);
            } else {
                DB::table('case_user')->updateOrInsert(
                    ['user_id' => $userId, 'case_id' => $case->id],
                    ['status' => $finalStatus, 'completed_at' => now()]
                );
            }
        }
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