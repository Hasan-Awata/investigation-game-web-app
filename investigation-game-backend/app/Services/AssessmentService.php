<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Choice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Events\LevelTransitioned;
use App\Events\ItemsUnlocked;
use App\Enums\RoomStatus;
use App\Enums\CaseUserStatus;

class AssessmentService
{
    public function __construct(private readonly VotingService $votingService) {}

    public function evaluateSubmission(GameRoom $room): Result
    {
        return DB::transaction(function () use ($room) {
            $level = $room->currentLevel;

            if (!$level) {
                return Result::failure("No active phase to evaluate. This phase may have already been submitted.");
            }
            
            // Eager load `choice` to resolve the N+1 loop flaw
            $votes = \App\Models\RoomVote::with('choice')->where('room_id', $room->id)
                ->whereHas('question', fn($q) => $q->where('level_id', $level->id))
                ->get();

            foreach ($votes as $vote) {
                $choice = $vote->choice;
                $givesStrike = filter_var($choice->outcomes['gives_strike'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if ($givesStrike) {
                    $room->increment('strikes');
                    $room->refresh();
                    
                    // Seamlessly broadcast the specific strike update 
                    ItemsUnlocked::dispatch($room, null, null, null, null, $room->strikes);

                    if ($room->strikes >= $room->gameCase->max_strikes) {
                        $totalGuilty = \App\Models\Suspect::where('case_id', $room->case_id)->where('is_guilty', true)->count();
                        $stats = $this->generateFinalStats($room, 0, 0, $totalGuilty, 0);

                        $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                        $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedStrikes->value, 0);
                        LevelTransitioned::dispatch($room, 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.', $stats);

                        return Result::success([
                            'status' => 'failed_final',
                            'message' => 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.',
                            'stats' => $stats
                        ]);
                    }

                    $hint = $choice->outcomes['feedback'] ?? "Re-evaluate the evidence thoroughly.";

                    \App\Models\RoomVote::where('room_id', $room->id)
                        ->whereHas('question', fn($q) => $q->where('level_id', $level->id))
                        ->delete();

                    return Result::success([
                        'status' => 'success',
                        'message' => $hint,
                    ]);
                }
            }

            $room->completedLevels()->syncWithoutDetaching([$level->id]);

            $completedCount = $room->completedLevels()->count();
            $totalLevels = $room->gameCase->levels()->count();

            $room->update(['current_level_id' => null]);

            if ($completedCount >= $totalLevels) {
                $responseMessage = 'Final verdict accepted. Stand by for further instructions.';
            } else {
                $responseMessage = 'Verdict accepted. Return to the roadmap to select the next phase.';
            }

            LevelTransitioned::dispatch($room, $responseMessage);

            return Result::success([
                'status' => 'success',
                'message' => $responseMessage
            ]);
        });
    }

    public function evaluateFinalVerdict(GameRoom $room, array $submittedSuspectIds): Result
    {
        return DB::transaction(function () use ($room, $submittedSuspectIds) {
            $case = $room->gameCase;

            if ($room->status !== \App\Enums\RoomStatus::Active) {
                return Result::failure("This investigation has already been concluded.");
            }

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
                LevelTransitioned::dispatch($room, $message, $stats);

                return Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            }

            $trueGuiltyIds = \App\Models\Suspect::where('case_id', $case->id)->where('is_guilty', true)->pluck('id')->toArray();

            $innocentsSubmitted = array_diff($submittedSuspectIds, $trueGuiltyIds);
            $missedGuilty = array_diff($trueGuiltyIds, $submittedSuspectIds);
            $correctGuesses = array_intersect($submittedSuspectIds, $trueGuiltyIds);

            $innocentMessage = "";
            if (count($innocentsSubmitted) > 0) {
                $innocentNames = \App\Models\Suspect::whereIn('id', $innocentsSubmitted)->pluck('name')->toArray();
                $verb = count($innocentNames) > 1 ? "were" : "was";
                $innocentMessage = " " . implode(', ', $innocentNames) . " {$verb} found innocent.";
            }

            if ($totalGuiltyCount === 0) {
                if (count($submittedSuspectIds) === 0) {
                    $stats = $this->generateFinalStats($room, $case->XP_on_solve, 0, 0, 0);
                    $room->update(['status' => \App\Enums\RoomStatus::Solved, 'final_stats' => $stats]);
                    $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::SolvedPerfect->value, $case->XP_on_solve);

                    $message = 'PERFECT WIN: You successfully proved that no foul play was involved. Case closed.';
                    LevelTransitioned::dispatch($room, $message, $stats);

                    return Result::success([
                        'status' => 'success',
                        'message' => $message,
                        'room' => $room,
                        'stats' => $stats
                    ]);
                } else {
                    $room->increment('strikes');
                    $room->refresh();
                    ItemsUnlocked::dispatch($room, null, null, null, null, $room->strikes);
                    
                    $maxStrikes = $case->max_strikes;

                    if ($room->strikes >= $maxStrikes) {
                        $stats = $this->generateFinalStats($room, 0, 0, 0, count($innocentsSubmitted));
                        $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                        $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::FailedStrikes->value, 0);

                        $message = 'DEPARTMENT THRESHOLD EXCEEDED. You accused innocent people of a fabricated crime. The DA has pulled your mandate.' . $innocentMessage;
                        LevelTransitioned::dispatch($room, $message, $stats);

                        return Result::success([
                            'status' => 'failed_final',
                            'message' => $message,
                            'stats' => $stats
                        ]);
                    }

                    $message = "The DA has rejected your indictment. STRIKE {$room->strikes}/{$maxStrikes} LOGGED.\n\nPersona Analysis: You are chasing a ghost. Are you certain a murder was even committed?" . $innocentMessage;
                    LevelTransitioned::dispatch($room, $message, null);

                    return Result::success([
                        'status' => 'failed',
                        'message' => $message
                    ]);
                }
            }

            if (count($missedGuilty) === 0 && count($innocentsSubmitted) === 0) {
                $stats = $this->generateFinalStats($room, $case->XP_on_solve, count($correctGuesses), $totalGuiltyCount, 0);
                $room->update(['status' => \App\Enums\RoomStatus::Solved, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::SolvedPerfect->value, $case->XP_on_solve);

                $message = 'PERFECT WIN: You successfully identified all perpetrators with irrefutable proof. Case closed.';
                LevelTransitioned::dispatch($room, $message, $stats);

                return Result::success([
                    'status' => 'success',
                    'message' => $message,
                    'room' => $room,
                    'stats' => $stats
                ]);
            }

            if (count($missedGuilty) === 0 && count($innocentsSubmitted) > 0) {
                $innocentsAccusedCount = count($innocentsSubmitted);
                $totalInnocentsInCase = \App\Models\Suspect::where('case_id', $case->id)->where('is_guilty', false)->count();
                $deductionPerInnocent = $totalInnocentsInCase > 0 ? (int) ceil(100 / $totalInnocentsInCase) : 100;
                $totalDeduction = min(100, $deductionPerInnocent * $innocentsAccusedCount);
                $multiplier = max(0, 100 - $totalDeduction) / 100;

                $xpPayload = (int) floor($case->XP_on_solve * $multiplier);
                $stats = $this->generateFinalStats($room, $xpPayload, count($correctGuesses), $totalGuiltyCount, $innocentsAccusedCount);

                $room->update(['status' => \App\Enums\RoomStatus::Solved, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::SolvedPartial->value, $xpPayload);

                $message = 'PARTIAL WIN: You successfully caught all perpetrators, but collateral damage was done.' . $innocentMessage;
                LevelTransitioned::dispatch($room, $message, $stats);

                return Result::success([
                    'status' => 'success',
                    'message' => $message,
                    'room' => $room,
                    'stats' => $stats
                ]);
            }

            $initialSuspectIds = \App\Models\Suspect::where('case_id', $case->id)->where('is_initial', true)->pluck('id')->toArray();
            $unlockedSuspectIds = $room->unlockedSuspects()->pluck('suspects.id')->toArray();
            $possessedSuspectIds = array_unique(array_merge($initialSuspectIds, $unlockedSuspectIds));
            $unpossessedMissedGuilty = array_diff($missedGuilty, $possessedSuspectIds);

            if (count($unpossessedMissedGuilty) > 0) {
                $stats = $this->generateFinalStats($room, 0, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::FailedIncomplete->value, 0);

                $message = 'INSTANT FAILURE: The true masterminds were never even on your radar. The remaining guilty people have escaped.' . $innocentMessage;
                LevelTransitioned::dispatch($room, $message, $stats);

                return Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            } else {
                $room->increment('strikes');
                $room->refresh();
                ItemsUnlocked::dispatch($room, null, null, null, null, $room->strikes);

                $maxStrikes = $case->max_strikes;

                if ($room->strikes >= $maxStrikes) {
                    $stats = $this->generateFinalStats($room, 0, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                    $room->update(['status' => \App\Enums\RoomStatus::Failed, 'final_stats' => $stats]);
                    $this->finalizeCaseForParticipants($room, \App\Enums\CaseUserStatus::FailedStrikes->value, 0);

                    $message = 'DEPARTMENT THRESHOLD EXCEEDED. You failed to indict the correct suspects. The DA has pulled your mandate.' . $innocentMessage;
                    LevelTransitioned::dispatch($room, $message, $stats);

                    return Result::success([
                        'status' => 'failed_final',
                        'message' => $message,
                        'stats' => $stats
                    ]);
                }

                $message = "The DA has rejected your indictment. STRIKE {$room->strikes}/{$maxStrikes} LOGGED.\n\nPersona Analysis: There are still guilty people on your board that you haven't accused." . $innocentMessage;
                LevelTransitioned::dispatch($room, $message, null);

                return Result::success([
                    'status' => 'failed',
                    'message' => $message
                ]);
            }
        });
    }

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
            $actualXpToAward = 0;

            if (!$existingRecord) {
                $actualXpToAward = $xpGained;
            } else {
                $isPreviousWin = in_array($previousStatus, [
                    \App\Enums\CaseUserStatus::SolvedPerfect->value,
                    \App\Enums\CaseUserStatus::SolvedPartial->value
                ]);

                if ($isPreviousWin) {
                    $actualXpToAward = 0;
                } else {
                    $actualXpToAward = (int) floor($xpGained / 2);
                }
            }

            if ($actualXpToAward > 0) {
                \App\Models\User::where('id', $userId)->increment('XP', $actualXpToAward);
            }

            if ($existingRecord) {
                $protectFromDowngrade = false;

                $isNewFail = in_array($finalStatus, [
                    \App\Enums\CaseUserStatus::FailedNoProof->value,
                    \App\Enums\CaseUserStatus::FailedIncomplete->value,
                    \App\Enums\CaseUserStatus::FailedStrikes->value
                ]);

                if ($previousStatus === \App\Enums\CaseUserStatus::SolvedPerfect->value) {
                    $protectFromDowngrade = true;
                }
                elseif ($previousStatus === \App\Enums\CaseUserStatus::SolvedPartial->value && $isNewFail) {
                    $protectFromDowngrade = true;
                }

                if ($protectFromDowngrade) {
                    \Illuminate\Support\Facades\DB::table('case_user')
                        ->where('id', $existingRecord->id)
                        ->update([
                            'completed_at' => now(),
                            'updated_at' => now()
                        ]);
                } else {
                    \Illuminate\Support\Facades\DB::table('case_user')
                        ->where('id', $existingRecord->id)
                        ->update([
                            'status' => $finalStatus,
                            'completed_at' => now(),
                            'updated_at' => now()
                        ]);
                }
            } else {
                \Illuminate\Support\Facades\DB::table('case_user')->insert([
                    'user_id' => $userId,
                    'case_id' => $case->id,
                    'status' => $finalStatus,
                    'completed_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
        }
    }

    private function generateFinalStats(GameRoom $room, int $xpGained, int $caught, int $total, int $innocents): array
    {
        $case = $room->gameCase;
        $diff = $room->created_at->diff(now());

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