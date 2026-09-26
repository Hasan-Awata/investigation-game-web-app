<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an admin-authored artifact stylesheet uses a construct that can
 * reach outside the artifact frame. Surfaced as a 422 on content_payload.css.
 */
class UnsafeArtifactStylesheetException extends RuntimeException
{
    /**
     * @param  list<string>  $violations
     */
    public static function because(array $violations): self
    {
        return new self(sprintf(
            'The artifact stylesheet uses disallowed CSS: %s.',
            implode(', ', $violations)
        ));
    }
}
