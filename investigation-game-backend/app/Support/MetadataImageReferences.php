<?php

namespace App\Support;

use Generator;

class MetadataImageReferences
{
    public static function paths(?array $metadata): Generator
    {
        if (isset($metadata['url'])) {
            yield 'url' => $metadata['url'];
        }

        yield from EvidenceTemplateCatalog::imagePaths($metadata['template'] ?? null);
    }
}
