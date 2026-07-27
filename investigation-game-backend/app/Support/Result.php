<?php

namespace App\Support;

readonly class Result
{
    private function __construct(
        public bool $isSuccess,
        public mixed $value = null,
        public ?string $errorMessage = null
    ) {}

    /**
     * Creates a successful result, optionally wrapping a return value.
     */
    public static function success(mixed $value = null): self
    {
        return new self(true, $value);
    }

    /**
     * Creates a failed result with an explicit error message.
     */
    public static function failure(string $errorMessage): self
    {
        return new self(false, null, $errorMessage);
    }

    /**
     * Helper to quickly check for failure.
     */
    public function isFailure(): bool
    {
        return !$this->isSuccess;
    }
}