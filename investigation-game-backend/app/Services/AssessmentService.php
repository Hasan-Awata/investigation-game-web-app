<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Character;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Events\LevelTransitioned;
use App\Events\ItemsUnlocked;
use App\Enums\RoomStatus;
use App\Enums\CaseUserStatus;

class AssessmentService
{
    use BroadcastsAfterCommit;

    public function __construct(
        private readonly VotingService $votingService
    ) {}

    public function evaluateSubmission(GameRoom $room): Result
    {
        return DB::transaction(function () use ($room) {
            $room = GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();

            if ($room->status !== RoomStatus::Active) {
                return Result::failure("This investigation has already concluded.");
            }

            $level = $room->currentLevel;

            if (!$level) {
                return Result::failure("No active zones to evaluate. This zones may have already been submitted.");
            }

            $startingQuestion = $level->questions->first();

            if (!$startingQuestion) {
                return Result::failure("This encounter has no active questioning chain to evaluate.");
            }

            $strikeChoice = null;
            $visited = [];
            $currentQuestion = $startingQuestion;

            while ($currentQuestion && !isset($visited[$currentQuestion->id])) {
                $visited[$currentQuestion->id] = true;

                $winningChoiceId = $this->votingService->getQuestionConsensusChoiceId($room, $currentQuestion->id);

                if ($winningChoiceId === null) {
                    return Result::failure('All active questions must have a clear team consensus (no ties) before submitting.');
                }

                $winningChoice = \App\Models\Choice::find($winningChoiceId);

                if (!$winningChoice) {
                    break;
                }

                $givesStrike = filter_var($winningChoice->outcomes['gives_strike'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($givesStrike) {
                    $strikeChoice = $winningChoice;
                    break;
                }

                $nextQuestionId = $winningChoice->outcomes['next_question_id'] ?? null;
                if (!$nextQuestionId) {
                    break;
                }

                $currentQuestion = \App\Models\Question::find($nextQuestionId);
            }

            if ($strikeChoice) {
                $room->increment('strikes');
                $room->refresh();

                $this->broadcastAfterCommit(new ItemsUnlocked($room, null, null, null, $room->strikes));

                if ($room->strikes >= $room->gameCase->max_strikes) {
                    $totalGuilty = Character::where('case_id', $room->case_id)->where('is_guilty', true)->count();
                    $stats = $this->generateFinalStats($room, 0, 0, $totalGuilty, 0);

                    $room->update(['status' => RoomStatus::Failed, 'final_stats' => $stats]);
                    $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedStrikes->value, 0);
                    $this->broadcastAfterCommit(new LevelTransitioned($room, 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.', $stats));

                    return Result::success([
                        'status' => 'failed_final',
                        'message' => 'DEPARTMENT THRESHOLD EXCEEDED. The Chief has pulled your team off the case. The guilty walk free.',
                        'stats' => $stats
                    ]);
                }

                $hint = $strikeChoice->outcomes['feedback'] ?? "Re-evaluate the evidence thoroughly.";

                \App\Models\RoomVote::where('room_id', $room->id)
                    ->whereHas('question', fn($q) => $q->where('level_id', $level->id))
                    ->delete();

                return Result::success([
                    'status' => 'success',
                    'message' => $hint,
                ]);
            }

            $room->completedLevels()->syncWithoutDetaching([$level->id]);

            $completedCount = $room->completedLevels()->count();
            $totalLevels = $room->gameCase->levels()->count();

            $room->update(['current_level_id' => null]);

            if ($completedCount >= $totalLevels) {
                $responseMessage = 'Final verdict accepted. Stand by for further instructions.';
            } else {
                $responseMessage = 'Verdict accepted. Return to the roadmap to select the next zone.';
            }

            $this->broadcastAfterCommit(new LevelTransitioned($room, $responseMessage));

            return Result::success([
                'status' => 'success',
                'message' => $responseMessage
            ]);
        });
    }

    /**
     * Possession of all vital evidence satisfies the conviction requirement.
     * If a client explicitly submits evidence presentation, that set must also
     * contain every vital item and each presented item must be possessed.
     */
    public function evaluateFinalVerdict(
        GameRoom $room,
        array $submittedCharacterIds,
        ?array $presentedEvidenceIds = null
    ): Result
    {
        return DB::transaction(function () use ($room, $submittedCharacterIds, $presentedEvidenceIds) {
            $room = GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();
            $case = $room->gameCase;

            if ($room->status !== RoomStatus::Active) {
                return Result::failure("This investigation has already been concluded.");
            }

            $vitalEvidenceIds = \App\Models\Evidence::where('case_id', $case->id)
                ->where('is_vital_for_conviction', true)->pluck('id')->toArray();

            $allPossessedEvidenceIds = $room->getPossessedEvidenceIds();

            $missingVital = array_diff($vitalEvidenceIds, $allPossessedEvidenceIds);
            $totalGuiltyCount = Character::where('case_id', $case->id)->where('is_guilty', true)->count();

            if (!empty($missingVital)) {
                $stats = $this->generateFinalStats($room, 0, 0, $totalGuiltyCount, 0);
                $room->update(['status' => RoomStatus::Failed, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedNoProof->value, 0);

                $message = 'INSTANT FAILURE: The DA threw out the case due to lack of definitive proof. You failed to uncover vital evidence.';
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                return Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            }

            if ($presentedEvidenceIds !== null) {
                $presentedEvidenceIds = collect($presentedEvidenceIds)
                    ->map(fn ($id) => (int) $id)
                    ->unique()
                    ->values()
                    ->all();

                if (array_diff($presentedEvidenceIds, $allPossessedEvidenceIds)) {
                    return Result::failure('You cannot present evidence your team has not discovered.');
                }

                if (array_diff($vitalEvidenceIds, $presentedEvidenceIds)) {
                    return Result::failure('The final case must present every piece of vital evidence.');
                }
            }

            $trueGuiltyIds = Character::where('case_id', $case->id)->where('is_guilty', true)->pluck('id')->toArray();

            $unlockedCharIds = $room->getUnlockedCharacterIds();
            if (!empty(array_diff($submittedCharacterIds, $unlockedCharIds))) {
                return Result::failure('You cannot indict suspects who have not yet been discovered in your investigation.');
            }

            $innocentsSubmitted = array_diff($submittedCharacterIds, $trueGuiltyIds);
            $missedGuilty = array_diff($trueGuiltyIds, $submittedCharacterIds);
            $correctGuesses = array_intersect($submittedCharacterIds, $trueGuiltyIds);

            $innocentMessage = "";
            if (count($innocentsSubmitted) > 0) {
                $innocentNames = Character::whereIn('id', $innocentsSubmitted)->pluck('name')->toArray();
                $verb = count($innocentNames) > 1 ? "were" : "was";
                $innocentMessage = " " . implode(', ', $innocentNames) . " {$verb} found innocent.";
            }

            if ($totalGuiltyCount === 0) {
                if (count($submittedCharacterIds) === 0) {
                    $stats = $this->generateFinalStats($room, $case->XP_on_solve, 0, 0, 0);
                    $room->update(['status' => RoomStatus::Solved, 'final_stats' => $stats]);
                    $this->finalizeCaseForParticipants($room, CaseUserStatus::SolvedPerfect->value, $case->XP_on_solve);

                    $message = 'PERFECT WIN: You successfully proved that no foul play was involved. Case closed.';
                    $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                    return Result::success([
                        'status' => 'success',
                        'message' => $message,
                        'room' => $room,
                        'stats' => $stats
                    ]);
                } else {
                    $room->increment('strikes');
                    $room->refresh();
                    $this->broadcastAfterCommit(new ItemsUnlocked($room, null, null, null, $room->strikes));

                    $maxStrikes = $case->max_strikes;

                    if ($room->strikes >= $maxStrikes) {
                        $stats = $this->generateFinalStats($room, 0, 0, 0, count($innocentsSubmitted));
                        $room->update(['status' => RoomStatus::Failed, 'final_stats' => $stats]);
                        $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedStrikes->value, 0);

                        $message = 'DEPARTMENT THRESHOLD EXCEEDED. You accused innocent people of a fabricated crime. The DA has pulled your mandate.' . $innocentMessage;
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                        return Result::success([
                            'status' => 'failed_final',
                            'message' => $message,
                            'stats' => $stats
                        ]);
                    }

                    $message = "The DA has rejected your indictment. STRIKE {$room->strikes}/{$maxStrikes} LOGGED.\n\nPersona Analysis: You are chasing a ghost. Are you certain a murder was even committed?" . $innocentMessage;
                    $this->broadcastAfterCommit(new LevelTransitioned($room, $message, null));

                    return Result::success([
                        'status' => 'failed',
                        'message' => $message
                    ]);
                }
            }

            if (count($missedGuilty) === 0 && count($innocentsSubmitted) === 0) {
                $stats = $this->generateFinalStats($room, $case->XP_on_solve, count($correctGuesses), $totalGuiltyCount, 0);
                $room->update(['status' => RoomStatus::Solved, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, CaseUserStatus::SolvedPerfect->value, $case->XP_on_solve);

                $message = 'PERFECT WIN: You successfully identified all perpetrators with irrefutable proof. Case closed.';
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                return Result::success([
                    'status' => 'success',
                    'message' => $message,
                    'room' => $room,
                    'stats' => $stats
                ]);
            }

            if (count($missedGuilty) === 0 && count($innocentsSubmitted) > 0) {
                $innocentsAccusedCount = count($innocentsSubmitted);
                $totalInnocentsInCase = Character::where('case_id', $case->id)->where('is_guilty', false)->count();
                $deductionPerInnocent = $totalInnocentsInCase > 0 ? (int) ceil(100 / $totalInnocentsInCase) : 100;
                $totalDeduction = min(100, $deductionPerInnocent * $innocentsAccusedCount);
                $multiplier = max(0, 100 - $totalDeduction) / 100;

                $xpPayload = (int) floor($case->XP_on_solve * $multiplier);
                $stats = $this->generateFinalStats($room, $xpPayload, count($correctGuesses), $totalGuiltyCount, $innocentsAccusedCount);

                $room->update(['status' => RoomStatus::Solved, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, CaseUserStatus::SolvedPartial->value, $xpPayload);

                $message = 'PARTIAL WIN: You successfully caught all perpetrators, but collateral damage was done.' . $innocentMessage;
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                return Result::success([
                    'status' => 'success',
                    'message' => $message,
                    'room' => $room,
                    'stats' => $stats
                ]);
            }

            $possessedCharacterIds = $room->getUnlockedCharacterIds();
            $unpossessedMissedGuilty = array_diff($missedGuilty, $possessedCharacterIds);

            if (count($unpossessedMissedGuilty) > 0) {
                $stats = $this->generateFinalStats($room, 0, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                $room->update(['status' => RoomStatus::Failed, 'final_stats' => $stats]);
                $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedIncomplete->value, 0);

                $message = 'INSTANT FAILURE: The true masterminds were never even on your radar. The remaining guilty people have escaped.' . $innocentMessage;
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                return Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            } else {
                $room->increment('strikes');
                $room->refresh();
                $this->broadcastAfterCommit(new ItemsUnlocked($room, null, null, null, $room->strikes));

                $maxStrikes = $case->max_strikes;

                if ($room->strikes >= $maxStrikes) {
                    $stats = $this->generateFinalStats($room, 0, count($correctGuesses), $totalGuiltyCount, count($innocentsSubmitted));
                    $room->update(['status' => RoomStatus::Failed, 'final_stats' => $stats]);
                    $this->finalizeCaseForParticipants($room, CaseUserStatus::FailedStrikes->value, 0);

                    $message = 'DEPARTMENT THRESHOLD EXCEEDED. You failed to indict the correct suspects. The DA has pulled your mandate.' . $innocentMessage;
                    $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                    return Result::success([
                        'status' => 'failed_final',
                        'message' => $message,
                        'stats' => $stats
                    ]);
                }

                $message = "The DA has rejected your indictment. STRIKE {$room->strikes}/{$maxStrikes} LOGGED.\n\nPersona Analysis: There are still guilty people on your board that you haven't accused." . $innocentMessage;
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, null));

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
                ->lockForUpdate()
                ->first();

            $previousStatus = $existingRecord->status ?? null;
            $actualXpToAward = 0;

            if (!$existingRecord) {
                $actualXpToAward = $xpGained;
            } else {
                $isPreviousWin = in_array($previousStatus, [
                    CaseUserStatus::SolvedPerfect->value,
                    CaseUserStatus::SolvedPartial->value
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
                    CaseUserStatus::FailedNoProof->value,
                    CaseUserStatus::FailedIncomplete->value,
                    CaseUserStatus::FailedStrikes->value
                ]);

                if ($previousStatus === CaseUserStatus::SolvedPerfect->value) {
                    $protectFromDowngrade = true;
                }
                elseif ($previousStatus === CaseUserStatus::SolvedPartial->value && $isNewFail) {
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
