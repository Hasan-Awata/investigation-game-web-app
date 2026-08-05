<?php

namespace App\Enums;

enum CaseUserStatus: string
{
    case SolvedPerfect = 'solved_perfect';
    case SolvedPartial = 'solved_partial';
    case FailedNoProof = 'failed_no_proof';
    case FailedIncomplete = 'failed_incomplete';
    case FailedStrikes = 'failed_strikes';

    // Helper methods to keep your controllers clean
    public function isSolved(): bool
    {
        return $this === self::SolvedPerfect || $this === self::SolvedPartial;
    }

    public function isFailed(): bool
    {
        return match($this) {
            self::FailedNoProof, self::FailedIncomplete, self::FailedStrikes => true,
            default => false,
        };
    }
}