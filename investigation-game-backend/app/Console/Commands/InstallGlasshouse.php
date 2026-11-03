<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\GameCase;
use App\Services\Case\CaseImportService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use ZipArchive;

final class InstallGlasshouse extends Command
{
    protected $signature = 'case:install-glasshouse {bundle} {--confirm-database=}';

    protected $description = 'Install verified Glasshouse content into an empty local case catalog.';

    public function handle(CaseImportService $importer): int
    {
        if (!app()->environment(['local', 'testing']) || $this->option('confirm-database') !== DB::connection()->getDatabaseName()) {
            $this->error('Installation requires a local environment and exact database confirmation.');
            return self::FAILURE;
        }
        if (GameCase::query()->exists()) {
            $this->error('The case catalog must be empty. Nothing was replaced.');
            return self::FAILURE;
        }
        $path = (string) $this->argument('bundle');
        $inventory = json_decode(file_get_contents(database_path('release-content/glasshouse-files/source.json')), true, flags: JSON_THROW_ON_ERROR);
        $zip = new ZipArchive;
        if (!is_file($path) || $zip->open($path, ZipArchive::RDONLY) !== true) {
            $this->error('Bundle is unreadable.');
            return self::FAILURE;
        }
        try {
            if ($zip->getFromName('case.json') !== file_get_contents(database_path('release-content/glasshouse-files/case.json'))) {
                $this->error('Bundle manifest differs from the approved release.');
                return self::FAILURE;
            }
            foreach ($inventory['media_sha256'] as $name => $hash) {
                $bytes = $zip->getFromName($name);
                if ($bytes === false || hash('sha256', $bytes) !== $hash) {
                    $this->error('Bundle media failed integrity verification.');
                    return self::FAILURE;
                }
            }
        } finally {
            $zip->close();
        }
        $case = $importer->import(new UploadedFile($path, 'glasshouse.zip', null, null, true), true);
        $this->info('Installed published Glasshouse case '.$case->id.'; bundle SHA-256: '.hash_file('sha256', $path));
        return self::SUCCESS;
    }
}
