<?php

namespace App\Console\Commands;

use App\Models\GameCase;
use App\Services\MediaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateLegacyCaseMaps extends Command
{
    protected $signature = 'cases:migrate-legacy-maps {--source= : Public directory containing the old Maps folder}';

    protected $description = 'Move legacy frontend map references into each case media folder';

    public function handle(MediaService $mediaService): int
    {
        $sourceRoot = $this->option('source')
            ?: dirname(base_path()).DIRECTORY_SEPARATOR.'investigation-game-frontend'.DIRECTORY_SEPARATOR.'public';
        $sourceRoot = realpath($sourceRoot);

        if ($sourceRoot === false || ! is_dir($sourceRoot)) {
            $this->error('The legacy public asset directory was not found. Pass its path with --source.');

            return self::FAILURE;
        }

        $migrated = 0;
        $failed = false;

        GameCase::query()
            ->where('map_url', 'like', '%/Maps/%')
            ->orderBy('id')
            ->chunkById(100, function ($cases) use ($sourceRoot, $mediaService, &$migrated, &$failed): void {
                foreach ($cases as $case) {
                    $legacyPath = parse_url((string) $case->getRawOriginal('map_url'), PHP_URL_PATH);
                    if (! is_string($legacyPath) || ! str_starts_with($legacyPath, '/Maps/')) {
                        $this->warn("Skipping case {$case->id}: map_url is not a legacy /Maps/ path.");
                        $failed = true;
                        continue;
                    }

                    $candidate = $sourceRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, ltrim($legacyPath, '/'));
                    $assetPath = realpath($candidate);
                    $rootPrefix = rtrim($sourceRoot, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;

                    if ($assetPath === false || ! is_file($assetPath) || ! str_starts_with($assetPath, $rootPrefix)) {
                        $this->warn("Skipping case {$case->id}: legacy map asset was not found safely.");
                        $failed = true;
                        continue;
                    }

                    $temporaryCopy = tempnam(sys_get_temp_dir(), 'legacy_case_map_');
                    if ($temporaryCopy === false || ! copy($assetPath, $temporaryCopy)) {
                        $this->warn("Skipping case {$case->id}: legacy map asset could not be copied for migration.");
                        $failed = true;
                        continue;
                    }

                    try {
                        $newUrl = $mediaService->storeFromPath(
                            $temporaryCopy,
                            basename($assetPath),
                            $case->title,
                            'Map',
                            true,
                            $case->id,
                        );
                    } finally {
                        if (is_file($temporaryCopy) && ! unlink($temporaryCopy)) {
                            $this->warn("Could not remove temporary map copy for case {$case->id}: {$temporaryCopy}");
                        }
                    }

                    if ($newUrl === null) {
                        $this->warn("Skipping case {$case->id}: legacy map asset could not be stored.");
                        $failed = true;
                        continue;
                    }

                    DB::transaction(fn () => $case->update(['map_url' => $newUrl]));
                    $migrated++;
                    $this->info("Migrated map for case {$case->id}.");
                }
            });

        $this->info("Migrated {$migrated} case map(s).");

        if ($failed) {
            $this->error('Some maps were skipped. Resolve the warnings and rerun this command.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
