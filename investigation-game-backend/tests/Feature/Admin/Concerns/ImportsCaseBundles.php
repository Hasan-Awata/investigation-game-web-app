<?php

namespace Tests\Feature\Admin\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

trait ImportsCaseBundles
{
    use ActsAsAdmin;

    private string $mediaRoot;

    protected function setUpImportsCaseBundles(): void
    {
        $this->mediaRoot = sys_get_temp_dir() . '/case-media-' . Str::uuid();
        File::ensureDirectoryExists($this->mediaRoot);
        $this->app->usePublicPath($this->mediaRoot);
    }

    protected function tearDownImportsCaseBundles(): void
    {
        if (isset($this->mediaRoot)) {
            File::deleteDirectory($this->mediaRoot);
        }
    }

    protected function importBundle(string $zipPath, bool $storeLocally = true): TestResponse
    {
        $file = UploadedFile::fake()->createWithContent(
            'case-bundle.zip',
            (string) file_get_contents($zipPath)
        );

        return $this->withHeaders(['Accept' => 'application/json'])
            ->post('/api/admin/cases/import', [
                'file' => $file,
                'store_locally' => $storeLocally,
            ]);
    }
}
