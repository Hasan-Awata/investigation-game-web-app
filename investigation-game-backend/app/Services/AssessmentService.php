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
use App\Enums\CaseUserStatus;

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
                        $totalGuilty = \App\Models\Suspect::where('case_id', $room->case_id)->where('is_guilty', true)->count();
                        $stats = $this->generateFinalStats($room, 0, 0, $totalGuilty, 0);

                        $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                        $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedStrikes->value, 0);
                        \App\Events\LevelTransitioned::dispatch($room, 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.', $stats);

                        return Result::success([
                            'status' => 'failed_final', 
                            'message' => 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.',
                            'stats' => $stats
                        ]);
                    }

                    // Extract the Persona hint for the exact question they failed
                    $hint = $question->msg_when_wrong ?? "Re-evaluate the evidence thoroughly.";

                    // REWIND LOGIC: Wipe all votes for this phase so they must start over
                    \App\Models\RoomVote::where('room_id', $room->id)
                        ->whereHas('question', fn($q) => $q->where('level_id', $level->id))
                        ->delete();

                    // Return standard failure, embedding the hint directly into the message
                    return \App\Support\Result::success([
                        'status' => 'success', 
                        'message' => $hint,  
                    ]);
                }
            }

            // 2. Mark Phase Complete & Check Suspension Condition
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

            LevelTransitioned::dispatch($room, $responseMessage);
            
            // Removed the unlocked arrays payload entirely
            return Result::success([
                'status' => 'success', 
                'message' => $responseMessage
            ]);
        });
    }

    /**
     * Evaluate the final suspect indictment submitted by the team.
     */
    public function evaluateFinalVerdict(GameRoom $room, array $submittedSuspectIds): \App\Support\Result
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($room, $submittedSuspectIds) {
            $case = $room->gameCase;

            // 1. STATUS GUARD
            if ($room->status !== \App\Enums\RoomStatus::Active) {
                return \App\Support\Result::failure("This investigation has already been concluded.");
            }

            // --- 2. THE PROOF CHECK (THE GATEKEEPER) ---
            $vitalEvidenceIds = \App\Models\Evidence::where('case_id', $case->id)
                ->where('is_vital_for_conviction', true)->pluck('id')->toArray();
            
            $unlockedEvidenceIds = $room->unlockedEvidences()->pluck('evidences.id')->toArray();
            $initialEvidenceIds = \App\Models\Evidence::where('case_id', $case->id)->where('is_initial', true)->pluck('id')->toArray();
            $allPossessedEvidence = array_unique(array_merge($unlockedEvidenceIds, $initialEvidenceIds));

            $missingVital = array_diff($vitalEvidenceIds, $allPossessedEvidence);
            $totalGuiltyCount = \App\Models\Suspect::where('case_id', $case->id)->where('is_guilty', true)->count();

            if (!empty($missingVital)) {
                $stats = $this->generateFinalStats($room, 0, 0, $totalGuiltyCount, 0);
                $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::FailedNoProof->value, 0);
                
                $message = 'INSTANT FAILURE: The DA threw out the case due to lack of definitive proof. You failed to uncover vital evidence.';
                \App\Events\LevelTransitioned::dispatch($room, $message, $stats);

                return \App\Support\Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            }

            // --- 3. THE INDICTMENT CHECK (THE VERDICT) ---
            $trueGuiltyIds = \App\Models\Suspect::where('case_id', $case->id)
                ->where('is_guilty', true)
                ->pluck('id')
                ->toArray();

            $innocentsSubmitted = array_diff($submittedSuspectIds, $trueGuiltyIds);
            $missedGuilty = array_diff($trueGuiltyIds, $submittedSuspectIds);
            $correctGuesses = array_intersect($submittedSuspectIds, $trueGuiltyIds);

            // Generate the dynamic message for accused innocents to append later
            $innocentMessage = "";
            if (count($innocentsSubmitted) > 0) {
                $innocentNames = \App\Models\Suspect::whereIn('id', $innocentsSubmitted)->pluck('name')->toArray();
                $verb = count($innocentNames) > 1 ? "were" : "was";
                $innocentMessage = " " . implode(', ', $innocentNames) . " {$verb} found innocent.";
            }

            // SCENARIO A: Perfect Win (Got everyone, no innocents)
            if (count($missedGuilty) === 0 && count($innocentsSubmitted) === 0) {
                $stats = $this->generateFinalStats($room, $case->XP_on_solve, count($correctGuesses), $totalGuiltyCount, 0);
                $room->update(['status' => \App\Enums\RoomStatus::Solved, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::SolvedPerfect->value, $case->XP_on_solve);
                
                $message = 'PERFECT WIN: You successfully identified all perpetrators with irrefutable proof. Case closed.';
                \App\Events\LevelTransitioned::dispatch($room, $message, $stats);

                return \App\Support\Result::success([
                    'status' => 'success',
                    'message' => $message,
                    'room' => $room,
                    'stats' => $stats
                ]);
            } 
            
            // SCENARIO B: Partial Win (Got all guilty, but included innocents)
            if (count($missedGuilty) === 0 && count($innocentsSubmitted) > 0) {
                $xpPayload = (int) floor($case->XP_on_solve / 2);
                $stats = $this->generateFinalStats($room, $xpPayload, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                
                $room->update(['status' => \App\Enums\RoomStatus::Solved, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::SolvedPartial->value, $xpPayload);
                
                $message = 'PARTIAL WIN: You successfully caught all perpetrators, but collateral damage was done.' . $innocentMessage;
                \App\Events\LevelTransitioned::dispatch($room, $message, $stats);

                return \App\Support\Result::success([
                    'status' => 'success',
                    'message' => $message,
                    'room' => $room,
                    'stats' => $stats
                ]);
            }

            // SCENARIO C: Failure States (Missed one or more guilty suspects)
            $initialSuspectIds = \App\Models\Suspect::where('case_id', $case->id)->where('is_initial', true)->pluck('id')->toArray();
            $unlockedSuspectIds = $room->unlockedSuspects()->pluck('suspects.id')->toArray();
            $possessedSuspectIds = array_unique(array_merge($initialSuspectIds, $unlockedSuspectIds));

            $unpossessedMissedGuilty = array_diff($missedGuilty, $possessedSuspectIds);

            if (count($unpossessedMissedGuilty) > 0) {
                // FAILURE 1: They never unlocked the required suspects in the campaign
                $stats = $this->generateFinalStats($room, 0, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::FailedIncomplete->value, 0);
                
                $message = 'INSTANT FAILURE: The true masterminds were never even on your radar. The remaining guilty people have escaped.' . $innocentMessage;
                \App\Events\LevelTransitioned::dispatch($room, $message, $stats);

                return \App\Support\Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            } else {
                // FAILURE 2: They had the suspects on their board, but failed to accuse them (Strike)
                $room->increment('strikes');
                $room->refresh();
                $maxStrikes = $case->max_strikes;

                if ($room->strikes >= $maxStrikes) {
                    $stats = $this->generateFinalStats($room, 0, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                    $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                    $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::FailedStrikes->value, 0);
                    
                    $message = 'DEPARTMENT THRESHOLD EXCEEDED. You failed to indict the correct suspects. The DA has pulled your mandate.' . $innocentMessage;
                    \App\Events\LevelTransitioned::dispatch($room, $message, $stats);

                    return \App\Support\Result::success([
                        'status' => 'failed_final',
                        'message' => $message,
                        'stats' => $stats
                    ]);
                }

                $message = "The DA has rejected your indictment. STRIKE {$room->strikes}/{$maxStrikes} LOGGED.\n\nPersona Analysis: There are still guilty people on your board that you haven't accused." . $innocentMessage;
                
                // We pass null for stats here because the room is still active
                \App\Events\LevelTransitioned::dispatch($room, $message, null);
                
                return \App\Support\Result::success([
                    'status' => 'failed',
                    'message' => $message
                ]);
            }
        });
    }

    /*
     * Populate the case_user history and distribute XP dynamically.
     */
    private function finalizeCaseForParticipants(GameRoom $room, string $finalStatus, int $xpGained): void
    {
        $userIds = $room->users()->pluck('user_id');
        $case = $room->gameCase;

        foreach ($userIds as $userId) {
            $existingRecord = \Illuminate\Support\Facades\DB::table('case_user')
                ->where('user_id', $userId)
                ->where('case_id', $case->id)
                ->first();

            $previousStatus = $existingRecord->status ?? null;

            // 1. Distribute XP
            // Prevent XP farming: Only award XP if they haven't already achieved a perfect solve.
            if ($xpGained > 0 && $previousStatus !== 'solved_perfect') {
                \App\Models\User::where('id', $userId)->increment('XP', $xpGained);
            }

            // 2. Preserve or Update State
            // If they already have a perfect solve on record, do not downgrade their status to a partial win or failure on replay.
            if ($previousStatus === 'solved_perfect') {
                \Illuminate\Support\Facades\DB::table('case_user')
                    ->where('id', $existingRecord->id)
                    ->update(['completed_at' => now()]);
            } else {
                // Otherwise, record their new outcome (solved_perfect, solved_partial, failed_no_proof, etc.)
                \Illuminate\Support\Facades\DB::table('case_user')->updateOrInsert(
                    ['user_id' => $userId, 'case_id' => $case->id],
                    ['status' => $finalStatus, 'completed_at' => now()]
                );
            }
        }
    }

    private function generateFinalStats(GameRoom $room, int $xpGained, int $caught, int $total, int $innocents): array
    {
        $case = $room->gameCase;
        
        // Use Carbon's native DateInterval to guarantee clean integers
        $diff = $room->created_at->diff(now());
        
        // Cascade downwards, appending the next smallest unit if it is greater than zero
        if ($diff->y > 0) {
            $timeTaken = "{$diff->y} years" . ($diff->m > 0 ? " {$diff->m} months" : "");
        } elseif ($diff->m > 0) {
            $timeTaken = "{$diff->m} months" . ($diff->d > 0 ? " {$diff->d} days" : "");
        } elseif ($diff->d >= 7) {
            $weeks = (int) floor($diff->d / 7);
            $days = $diff->d % 7;
            $timeTaken = "{$weeks} weeks" . ($days > 0 ? " {$days} days" : "");
        } elseif ($diff->d > 0) {
            $timeTaken = "{$diff->d} days" . ($diff->h > 0 ? " {$diff->h} hours" : "");
        } elseif ($diff->h > 0) {
            $timeTaken = "{$diff->h} hours" . ($diff->i > 0 ? " {$diff->i} minutes" : "");
        } else {
            $timeTaken = "Less than a minute";
        }

        return [
            'time_taken' => $timeTaken,
            'xp_gained' => $xpGained,
            'max_xp' => $case->XP_on_solve,
            'suspects_caught' => $caught,
            'total_guilty' => $total,
            'innocents_accused' => $innocents,
        ];
    }
}