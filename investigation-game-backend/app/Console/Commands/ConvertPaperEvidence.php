<?php

namespace App\Console\Commands;

use App\Models\Evidence;
use App\Services\Case\CaseImportService;
use App\Services\Case\PaperEvidenceConversion;
use App\Services\MediaService;
use App\Support\EvidenceTemplateCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ConvertPaperEvidence extends Command
{
    protected $signature = 'case:convert-paper {--case=} {--bundle=} {--reviews=} {--output=} {--apply}';

    protected $description = 'Inventory, validate or apply reviewed replacements for legacy paper evidence.';

    public function handle(CaseImportService $bundles, MediaService $media): int
    {
        $case = $this->option('case');
        $bundle = $this->option('bundle');
        $reviewsPath = $this->option('reviews');
        $output = $this->option('output');
        $apply = $this->option('apply');
        if ((bool) $case === (bool) $bundle || ($case && (! ctype_digit($case) || $output)) || ($apply && (! $reviewsPath || ($bundle && ! $output))) || ($output && ! $apply)) {
            $this->error('Specify one of --case or --bundle. Supply --reviews with --apply and choose a new --output when applying a bundle conversion.');

            return self::INVALID;
        }

        try {
            $reviews = $reviewsPath ? json_decode(file_get_contents($reviewsPath), true, flags: JSON_THROW_ON_ERROR) : null;
            if ($reviewsPath && ! is_array($reviews)) {
                throw new \InvalidArgumentException('The review file must contain replacements keyed by evidence ID or ref_id.');
            }
            $inventory = $bundle ? $bundles->convertPaperBundle($bundle, $reviews, $output)
                : $this->convertCase((int) $case, $reviews, $apply, $media);
            $this->line(json_encode((object) $inventory, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

            return self::SUCCESS;
        } catch (ValidationException $exception) {
            foreach ($exception->errors() as $path => $messages) {
                $this->error($path.' '.implode(' ', $messages));
            }
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());
        }

        return self::FAILURE;
    }

    private function convertCase(int $case, ?array $reviews, bool $apply, MediaService $media): array
    {
        return DB::transaction(function () use ($case, $reviews, $apply, $media) {
            $inventory = [];
            $query = Evidence::query()->where('case_id', $case)->whereIn('evidence_type', ['document', 'forensic']);
            foreach (($apply ? $query->lockForUpdate() : $query)->lazyById(100) as $evidence) {
                if (isset($evidence->metadata['template'])) {
                    continue;
                }
                $id = $evidence->id;
                $inventory[$id] = ['title' => $evidence->title, 'expected_sha256' => PaperEvidenceConversion::fingerprint($evidence->metadata)];
                if ($reviews === null) {
                    continue;
                }
                $replacement = PaperEvidenceConversion::replacement($id, $evidence->evidence_type->value, $evidence->metadata, $reviews[$id] ?? null);
                foreach (EvidenceTemplateCatalog::imagePaths($replacement['template']) as $path => $url) {
                    $reference = $media->caseImageReference($url, $case);
                    if ($reference === null) {
                        throw ValidationException::withMessages(["evidences.{$id}.metadata.{$path}" => 'Select an existing image from this case.']);
                    }
                    Arr::set($replacement, $path, $reference);
                }
                if ($apply) {
                    $evidence->update(['metadata' => $replacement]);
                }
            }

            return $inventory;
        });
    }
}
