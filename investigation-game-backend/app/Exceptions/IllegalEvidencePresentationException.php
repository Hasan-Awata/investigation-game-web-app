<?php

namespace App\Exceptions;

use App\Enums\EvidenceType;
use App\Enums\ViewerStrategy;
use RuntimeException;

/**
 * Thrown when a stored or submitted evidence type cannot be presented by the
 * requested viewer strategy. The model's saving hook turns this into a 422 via
 * the form request, so an illegal combination can never reach the database.
 */
class IllegalEvidencePresentationException extends RuntimeException
{
    public static function forStrategy(EvidenceType $type, ViewerStrategy $strategy, array $allowed): self
    {
        return new self(sprintf(
            'Evidence type [%s] cannot be presented by the [%s] viewer strategy; allowed: %s.',
            $type->value,
            $strategy->value,
            implode(', ', array_map(
                static fn (ViewerStrategy $candidate): string => $candidate->value,
                $allowed
            ))
        ));
    }

    public static function forFinish(EvidenceType $type, ViewerStrategy $strategy, ?string $finish): self
    {
        return new self(sprintf(
            'Paper finish [%s] is not valid for evidence type [%s] on the [%s] viewer strategy.',
            $finish ?? 'null',
            $type->value,
            $strategy->value
        ));
    }

    public static function missingStrategy(EvidenceType $type, array $allowed): self
    {
        return new self(sprintf(
            'No viewer strategy resolved for evidence type [%s]; allowed: %s.',
            $type->value,
            implode(', ', array_map(
                static fn (ViewerStrategy $candidate): string => $candidate->value,
                $allowed
            ))
        ));
    }
}
