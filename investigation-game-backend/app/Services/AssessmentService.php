<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Choice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Events\LevelTransitioned;
use App\Events\EvidenceDiscovered;
use App\Enums\RoomStatus;

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
                
                $maxStrikes = $room->gameCase->max_strikes; 

                // IF THEY SUBMIT THE WRONG ANSWER
                if (!$isCorrect) {
                    $room->increment('strikes');
                    $room->refresh();

                    if ($room->strikes >= $maxStrikes) {
                        $room->update(['status' => \App\Enums\RoomStatus::Failed]);
                        $this->finalizeCaseForParticipants($room, 'failed');
                        \App\Events\LevelTransitioned::dispatch($room);

                        return Result::success([
                            'status' => 'failed_final', 
                            'message' => 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.'
                        ]);
                    }

                    // Extract the Persona hint for the exact question they failed
                    $hint = $question->msg_when_wrong ?? "Re-evaluate the evidence thoroughly.";

                    // REWIND LOGIC: Wipe all votes for this phase so they must start over
                    \App\Models\RoomVote::where('room_id', $room->id)
                        ->whereHas('question', fn($q) => $q->where('level_id', $level->id))
                        ->delete();

                    // Return standard failure, embedding the hint directly into the message
                    return Result::success([
                        'status' => 'failed', 
                        'message' => "The logic on a critical verdict is flawed. STRIKE {$room->strikes}/{$maxStrikes} LOGGED.\n\nPersona Analysis: {$hint}"
                    ]);
                }
            }

            // 2. Process Narrative Unlocks (Evidence & Phases)
            $newlyUnlockedEvidences = [];
            $newlyUnlockedLevels = [];
            
            // Loop through all locked consensus choices to check for narrative triggers
            foreach ($consensus as $questionId => $chosenId) {
                $choice = Choice::find($chosenId);

                if ($choice && $choice->unlocks_evidence_id) {
                    DB::table('room_evidences')->updateOrInsert([
                        'room_id' => $room->id,
                        'evidence_id' => $choice->unlocks_evidence_id
                    ]);
                    $newlyUnlockedEvidences[] = $choice->unlocks_evidence_id;
                }

                if ($choice && $choice->unlocks_level_id) {
                    DB::table('room_unlocked_levels')->updateOrInsert([
                        'room_id' => $room->id,
                        'level_id' => $choice->unlocks_level_id
                    ]);
                    $newlyUnlockedLevels[] = $choice->unlocks_level_id;
                }
            }

            if (!empty($newlyUnlockedEvidences) || !empty($newlyUnlockedLevels)) {
                // You can rename this event to NarrativeDiscovered later if you prefer
                \App\Events\EvidenceDiscovered::dispatch($room, $newlyUnlockedEvidences);
            }

            // 3. Mark Phase Complete & Check Suspension Condition
            $room->completedLevels()->syncWithoutDetaching([$level->id]);
            
            $completedCount = $room->completedLevels()->count();
            $totalLevels = $room->gameCase->levels()->count();

            // Unhook the current level to return players to the roadmap UI
            $room->update(['current_level_id' => null]);

            if ($completedCount >= $totalLevels) {
                // ALL PHASES COMPLETE: Room remains active. Custom flow takes over from here.
                $responseMessage = 'Final verdict accepted. Stand by for further instructions.';
            } else {
                // PHASE COMPLETE: Return to roadmap
                $responseMessage = 'Verdict accepted. Return to the roadmap to select the next phase.';
            }

            LevelTransitioned::dispatch($room);
            
            return Result::success([
                'status' => 'success', 
                'message' => $responseMessage,
                'unlocked_evidence' => $newlyUnlockedEvidences,
                'unlocked_levels' => $newlyUnlockedLevels 
            ]);
        });
    }

    /**
     * Populate the case_user history and distribute XP dynamically.
     * (Currently only triggered by the 'failed' state until your custom flow triggers 'solved').
     */
    private function finalizeCaseForParticipants(GameRoom $room, string $finalStatus): void
    {
        $userIds = $room->users()->pluck('user_id');
        $case = $room->gameCase;

        foreach ($userIds as $userId) {
            $existingRecord = DB::table('case_user')
                ->where('user_id', $userId)
                ->where('case_id', $case->id)
                ->first();

            $previousStatus = $existingRecord->status ?? null;

            // 1. Calculate XP Payload (If manually triggered later)
            if ($finalStatus === 'solved') {
                $xpGained = 0;
                
                if ($previousStatus === 'solved') {
                    $xpGained = 0; 
                } elseif ($previousStatus === 'failed') {
                    $xpGained = (int) floor($case->XP_on_solve / 2); 
                } else {
                    $xpGained = $case->XP_on_solve; 
                }

                if ($xpGained > 0) {
                    User::where('id', $userId)->increment('XP', $xpGained);
                }
            }

            // 2. Preserve or Update State
            if ($previousStatus === 'solved') {
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
}