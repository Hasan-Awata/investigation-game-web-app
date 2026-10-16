<?php

namespace Tests\Feature\Admin\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Testing\TestResponse;

trait ImportsCaseBundles
{
    use ActsAsAdmin;

    /**
     * Case slugs whose local media the bundle tests write into public/assets.
     */
    private const TEST_CASE_SLUGS = [
        'the-vanishing-at-pier-9',
        'minimal-case',
        'factory-case',
        'ghost-media-case',
    ];

    protected function tearDown(): void
    {
        foreach (self::TEST_CASE_SLUGS as $slug) {
            $directory = public_path("assets/cases/{$slug}");

            if (is_dir($directory)) {
                File::deleteDirectory($directory);
            }
        }

        parent::tearDown();
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
