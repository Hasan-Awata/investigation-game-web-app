<?php

namespace App\Support;

use Generator;
use Illuminate\Validation\ValidationException;

class MetadataImageReferences
{
    public static function paths(?array $metadata): Generator
    {
        if (isset($metadata['url'])) {
            yield 'url' => $metadata['url'];
        }

        yield from self::blockPaths($metadata['doc']['blocks'] ?? [], 'doc.blocks', 0);
    }

    private static function blockPaths(mixed $blocks, string $prefix, int $depth): Generator
    {
        if (! is_array($blocks) || $blocks === []) {
            return;
        }
        if ($depth > 32) {
            throw ValidationException::withMessages([$prefix => 'Document blocks may not be nested more than 32 levels deep.']);
        }

        foreach ($blocks as $index => $block) {
            if (! is_array($block)) {
                continue;
            }

            $path = "{$prefix}.{$index}.props";
            if (($block['type'] ?? null) === 'image') {
                yield "{$path}.url" => $block['props']['url'] ?? null;
            }
            if (($block['type'] ?? null) === 'two_column') {
                foreach (['left', 'right'] as $column) {
                    yield from self::blockPaths($block['props'][$column] ?? [], "{$path}.{$column}", $depth + 1);
                }
            }
        }
    }
}
