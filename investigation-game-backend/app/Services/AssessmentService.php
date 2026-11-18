<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\Character;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Events\LevelTransitioned;
use App\Events\ManagementTrustChanged;
use App\Enums\RoomStatus;
use App\Enums\CaseUserStatus;

class AssessmentService
{
    use BroadcastsAfterCommit;

    public function __construct(private readonly EncounterGroupService $encounters) {}

    /** The caller holds the room lock inside its gameplay transaction. */
    public function deductManagementTrust(
        GameRoom $room,
        int $requestedLoss,
        string $reason,
        int $caught = 0,
        int $innocents = 0,
    ): array {
        if ($room->status !== RoomStatus::Active) {
            throw new \LogicException('Management Trust can only change in an active room.');
        }

        $loss = min($room->management_trust, max(0, $requestedLoss));
        $remaining = $room->management_trust - $loss;
        if ($loss === 0) {
            return ['trust_loss' => 0, 'management_trust' => $remaining];
        }

        $room->update(['management_trust' => $remaining]);
        $this->broadcastAfterCommit(new ManagementTrustChanged($room->id, $remaining, $loss, $reason));

        $result = ['trust_loss' => $loss, 'management_trust' => $remaining];
        if ($remaining === 0) {
            $total = Character::query()->where('case_id', $room->case_id)->where('is_guilty', true)->count();
            $stats = $this->generateFinalStats($room, 0, $caught, $total, $innocents);
            $stats['failure_reason'] = CaseUserStatus::FailedTrust->value;
            $result['stats'] = $this->conclude($room, RoomStatus::Failed, $stats, CaseUserStatus::FailedTrust, 0);
            $this->broadcastAfterCommit(new LevelTransitioned($room, null, $result['stats']));
        }

        return $result;
    }

    private function rejectVerdict(GameRoom $room, string $message, int $caught, int $innocents): Result
    {
        $trust = $this->deductManagementTrust($room, 25, 'verdict', $caught, $innocents);
        if ($trust['management_trust'] === 0) {
            return Result::success(['status' => 'failed_final', 'message' => $message] + $trust);
        }

        return Result::success(['status' => 'failed', 'message' => $message] + $trust);
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
                $stats = $this->conclude($room, RoomStatus::Failed, $stats, CaseUserStatus::FailedNoProof, 0);

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
                    $stats = $this->conclude($room, RoomStatus::Solved, $stats, CaseUserStatus::SolvedPerfect, $case->XP_on_solve);

                    $message = 'PERFECT WIN: You successfully proved that no foul play was involved. Case closed.';
                    $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                    return Result::success([
                        'status' => 'success',
                        'message' => $message,
                        'room' => $room,
                        'stats' => $stats
                    ]);
                }

                return $this->rejectVerdict(
                    $room,
                    'The DA has rejected your indictment. Are you certain a murder was even committed?' . $innocentMessage,
                    0,
                    count($innocentsSubmitted),
                );
            }

            if (count($missedGuilty) === 0 && count($innocentsSubmitted) === 0) {
                $stats = $this->generateFinalStats($room, $case->XP_on_solve, count($correctGuesses), $totalGuiltyCount, 0);
                $stats = $this->conclude($room, RoomStatus::Solved, $stats, CaseUserStatus::SolvedPerfect, $case->XP_on_solve);

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

                $stats = $this->conclude($room, RoomStatus::Solved, $stats, CaseUserStatus::SolvedPartial, $xpPayload);

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
                $stats = $this->conclude($room, RoomStatus::Failed, $stats, CaseUserStatus::FailedIncomplete, 0);

                $message = 'INSTANT FAILURE: The true masterminds were never even on your radar. The remaining guilty people have escaped.' . $innocentMessage;
                $this->broadcastAfterCommit(new LevelTransitioned($room, $message, $stats));

                return Result::success([
                    'status' => 'failed_final',
                    'message' => $message,
                    'stats' => $stats
                ]);
            }

            return $this->rejectVerdict(
                $room,
                'The DA has rejected your indictment. There are still guilty people on your board that you have not accused.' . $innocentMessage,
                count($correctGuesses),
                count($innocentsSubmitted),
            );
        });
    }

    private function conclude(GameRoom $room, RoomStatus $status, array $stats, CaseUserStatus $result, int $xp): array
    {
        $room->update(['status' => $status, 'final_stats' => $stats]);
        $this->encounters->closeForConcludedRoom($room);
        $stats['xp_awards'] = $this->finalizeCaseForParticipants($room, $result->value, $xp);
        $room->update(['final_stats' => $stats]);
        return $stats;
    }

    /** @return array<int, int> Actual awards, including replay reductions, by participant. */
    private function finalizeCaseForParticipants(GameRoom $room, string $finalStatus, int $xpGained): array
    {
        $userIds = $room->users()->pluck('user_id');
        $case = $room->gameCase;
        $awards = [];

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
            $awards[(int) $userId] = $actualXpToAward;

            if ($existingRecord) {
                $protectFromDowngrade = false;

                $isNewFail = in_array($finalStatus, [
                    CaseUserStatus::FailedNoProof->value,
                    CaseUserStatus::FailedIncomplete->value,
                    CaseUserStatus::FailedTrust->value
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
        return $awards;
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
        } elseif ($diff->i > 0) {
            $timeTaken = "{$diff->i} ".($diff->i === 1 ? 'minute' : 'minutes');
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
