<?php

namespace App\Services\Case;

use App\Support\EvidenceTemplateCatalog;
use Illuminate\Validation\ValidationException;

final class PaperEvidenceConversion
{
    public static function fingerprint(mixed $metadata): string
    {
        return hash('sha256', json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    public static function replacement(int|string $ref, string $type, mixed $metadata, mixed $review): array
    {
        if (! is_array($review) || self::fingerprint($metadata) !== ($review['expected_sha256'] ?? null)) {
            throw ValidationException::withMessages(["evidences.{$ref}" => 'Review this evidence against its current metadata before converting.']);
        }

        $template = $review['template'] ?? null;
        $errors = EvidenceTemplateCatalog::errors($template, $type);
        if ($errors !== []) {
            throw ValidationException::withMessages(collect($errors)->mapWithKeys(fn ($messages, $path) => ["evidences.{$ref}.{$path}" => $messages])->all());
        }

        $preserved = is_array($metadata) && array_key_exists('doc', $metadata) ? array_diff_key($metadata, ['doc' => true]) : [];

        return [...$preserved, 'template' => $template];
    }
}
