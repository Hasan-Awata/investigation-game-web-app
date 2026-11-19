<?php

namespace App\Services\Case;

use App\Models\GameCase;
use App\Services\MediaService;
use App\Support\EvidenceTemplateCatalog;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

final class EvidenceTemplateMedia
{
    public function __construct(private readonly MediaService $media) {}

    public function resolve(array $metadata, GameCase $case, array $uploads, bool $local, array &$created): array
    {
        foreach (EvidenceTemplateCatalog::imagePaths($metadata['template'] ?? null) as $path => $url) {
            $key = substr($path, strlen('template.values.'));
            if (isset($uploads[$key])) {
                continue;
            }
            $reference = $this->media->caseImageReference($url, $case->id);
            if ($reference === null) {
                throw ValidationException::withMessages(["metadata.{$path}" => 'Select a managed image from this case or upload a replacement.']);
            }
            Arr::set($metadata, $path, $reference);
        }
        foreach ($uploads as $key => $file) {
            $metadata['template']['values'][$key] = $this->media->store($file, $case->title, 'Evidences', $local, $case->id, $created);
        }

        return $metadata;
    }
}
