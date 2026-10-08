<?php

namespace App\Enums;

enum CaseUserStatus: string
{
    case SolvedPerfect = 'solved_perfect';
    case SolvedPartial = 'solved_partial';
    case FailedNoProof = 'failed_no_proof';
    case FailedIncomplete = 'failed_incomplete';
    case FailedStrikes = 'failed_strikes';
}