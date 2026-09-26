<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Thrown when a validated upload cannot be persisted to its disk.
 *
 * The disks in filesystems.php are configured with 'throw' => false, so a
 * write failure would otherwise be indistinguishable from success until the
 * asset row was written with a broken path. Flysystem also raises its own
 * exceptions for failures that precede the write, and those messages embed the
 * absolute server path, so they are funnelled through here as well.
 */
class EvidenceAssetWriteFailed extends RuntimeException
{
    public static function because(string $message, ?Throwable $previous = null): self
    {
        return new self($message, previous: $previous);
    }
}
