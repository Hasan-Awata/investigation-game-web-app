<?php

namespace Tests\Feature\Admin;

use App\Models\Choice;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Services\Case\CaseExportService;
use App\Services\MediaService;
use Cloudinary\Api\ApiResponse;
use Cloudinary\Api\Upload\UploadApi;
use Cloudinary\Cloudinary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\Support\CaseBundleFactory;
use Tests\TestCase;
use ZipArchive;

class DocumentBundleImagesTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

    private const PORTRAIT = 'template.values.portrait';

    private const FINGERPRINTS = 'template.values.fingerprints';

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAdmin();
        Storage::fake('local');
        Http::preventStrayRequests();
    }

    #[DataProvider('templateImageStorageModes')]
    public function test_template_image_upload_accepts_serialized_boolean_storage_modes(string $encoded, bool $storeLocally): void
    {
        $case = GameCase::create(['title' => 'Template upload', 'story' => 'Story', 'XP_on_solve' => 100]);
        $url = '/assets/cases/test/Evidences/image.png';
        $this->mock(MediaService::class, function (Mockery\MockInterface $mock) use ($case, $storeLocally, $url): void {
            $mock->shouldReceive('store')->once()
                ->with(Mockery::type(UploadedFile::class), $case->title, 'Evidences', $storeLocally, $case->id, [])
                ->andReturn($url);
        });

        $this->withHeaders(['Accept' => 'application/json'])->post('/api/admin/evidences', [
            'case_id' => (string) $case->id,
            'title' => 'Background check',
            'evidence_type' => 'document',
            'is_initial' => '0',
            'is_vital_for_conviction' => '0',
            'store_locally' => $encoded,
            'metadata' => json_encode(['template' => ['id' => 'background_check', 'version' => 1, 'values' => ['subject' => 'Case subject']]]),
            'template_images' => ['portrait' => UploadedFile::fake()->createWithContent('image.png', base64_decode(self::IMAGE))],
        ])->assertCreated()->assertJsonPath('evidence.metadata.template.values.portrait', $url);
    }

    public static function templateImageStorageModes(): array
    {
        return ['local' => ['1', true], 'provider' => ['0', false]];
    }

    #[DataProvider('metadataFormats')]
    public function test_document_images_round_trip_without_the_source_files(bool $encoded): void
    {
        $metadata = $this->metadata('media/top.png', 'media/nested.png');
        $metadata['url'] = 'media/top.png';
        $manifest = CaseBundleFactory::minimalManifest([
            'format_version' => 3,
            'case' => ['cover' => 'media/top.png'],
            'evidences' => [['title' => 'Document', 'evidence_type' => 'document', 'metadata' => $encoded ? json_encode($metadata) : $metadata]],
        ]);
        $nestedImage = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVQIHWP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC');
        $images = ['media/top.png' => base64_decode(self::IMAGE), 'media/nested.png' => $nestedImage];
        $bundle = CaseBundleFactory::build($manifest, $images);
        try {
            $response = $this->importBundle($bundle)->assertCreated();
            $source = GameCase::findOrFail($response->json('case_id'));
            $evidence = $source->evidences()->firstOrFail();
            $this->assertSame($source->getRawOriginal('img_url'), $evidence->metadata['url']);
            $this->assertSame($evidence->metadata['url'], Arr::get($evidence->metadata, self::PORTRAIT));
            $this->assertSame([], Storage::disk('local')->allDirectories('tmp'));
            $this->putJson("/api/admin/evidences/{$evidence->id}", [
                'case_id' => $source->id, 'title' => $evidence->title, 'evidence_type' => 'document',
                'metadata' => $evidence->metadata, 'is_initial' => false, 'is_vital_for_conviction' => false, 'store_locally' => true,
            ])->assertOk();

            $export = app(CaseExportService::class)->export($source);
            try {
                $zip = new ZipArchive;
                $this->assertTrue($zip->open($export));
                $exported = json_decode($zip->getFromName('case.json'), true);
                $this->assertSame(3, $zip->numFiles);
                foreach (['url', self::PORTRAIT, self::FINGERPRINTS] as $path) {
                    $entry = Arr::get($exported['evidences'][0]['metadata'], $path);
                    $this->assertStringStartsWith('media/', $entry);
                    $this->assertSame($path === self::FINGERPRINTS ? $nestedImage : base64_decode(self::IMAGE), $zip->getFromName($entry));
                }
                $this->assertSame($exported['case']['cover'], $exported['evidences'][0]['metadata']['url']);
                $zip->close();

                foreach (File::allFiles(public_path('assets/cases')) as $file) {
                    File::delete($file->getPathname());
                }
                $source->update(['title' => 'Source unavailable']);
                $response = $this->importBundle($export)->assertCreated();
                $copy = GameCase::findOrFail($response->json('case_id'))->evidences()->firstOrFail();
                foreach (['url', self::PORTRAIT, self::FINGERPRINTS] as $path) {
                    $url = Arr::get($copy->metadata, $path);
                    $this->assertSame($path === self::FINGERPRINTS ? $nestedImage : base64_decode(self::IMAGE), file_get_contents(public_path($url)));
                }
                $this->assertSame($copy->metadata['url'], Arr::get($copy->metadata, self::PORTRAIT));
                $this->assertSame($evidence->metadata, $evidence->fresh()->metadata);
            } finally {
                unlink($export);
            }
        } finally {
            unlink($bundle);
        }
    }

    public static function metadataFormats(): array
    {
        return ['object' => [false], 'JSON string' => [true]];
    }

    #[DataProvider('invalidImages')]
    public function test_embedded_images_are_validated_before_persistence(mixed $url, ?string $bytes): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'format_version' => 3,
            'evidences' => [['title' => 'Document', 'evidence_type' => 'document', 'metadata' => $this->metadata('media/top.png', $url)]],
        ]);
        $files = ['media/top.png' => base64_decode(self::IMAGE)];
        if ($bytes !== null) {
            $files['media/invalid.png'] = $bytes;
        }
        $bundle = CaseBundleFactory::build($manifest, $files);
        try {
            $this->importBundle($bundle)->assertUnprocessable()
                ->assertJsonValidationErrors('evidences.0.metadata.'.self::FINGERPRINTS);
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allDirectories('tmp'));
            $this->assertDirectoryDoesNotExist(public_path('assets/cases'));
            Http::assertNothingSent();
        } finally {
            unlink($bundle);
        }
    }

    public static function invalidImages(): array
    {
        return [
            'missing' => ['media/missing.png', null],
            'traversal' => ['media/../case.json', null],
            'external URL' => ['https://other.test/image.png', null],
            'invalid bytes' => ['media/invalid.png', '<?php echo 1;'],
            'array URL' => [['media/invalid.png'], null],
        ];
    }

    #[DataProvider('storageModes')]
    public function test_shared_embedded_images_use_the_import_cache_and_failure_cleanup(bool $local, bool $fail): void
    {
        $url = 'https://res.cloudinary.com/owned-cloud/image/upload/cases/test/Evidences/image.png';
        if (! $local) {
            config(['filesystems.disks.cloudinary.cloud' => 'owned-cloud']);
            $api = Mockery::mock(UploadApi::class);
            $api->shouldReceive('upload')->once()->andReturn(new ApiResponse(['secure_url' => $url], []));
            if ($fail) {
                $api->shouldReceive('destroy')->once()->with('cases/test/Evidences/image', ['resource_type' => 'image'])->andReturn(['result' => 'ok']);
            }
            $cloudinary = Mockery::mock(Cloudinary::class);
            $cloudinary->shouldReceive('uploadApi')->times($fail ? 2 : 1)->andReturn($api);
            $this->app->bind(Cloudinary::class, fn () => $cloudinary);
        }
        if ($fail) {
            Choice::creating(fn () => throw new \RuntimeException('Injected late graph failure'));
        }
        $manifest = CaseBundleFactory::minimalManifest([
            'format_version' => 3,
            'evidences' => [[
                'title' => 'Document', 'evidence_type' => 'document', 'img' => 'media/shared.png',
                'metadata' => $this->metadata('media/shared.png', 'media/shared.png'),
            ]],
        ]);
        $bundle = CaseBundleFactory::build($manifest, ['media/shared.png' => base64_decode(self::IMAGE)]);
        try {
            $response = $this->importBundle($bundle, $local);
            if ($fail) {
                $response->assertStatus(500);
                $this->assertDatabaseCount('cases', 0);
                $this->assertDatabaseCount('evidences', 0);
                if ($local) {
                    $this->assertSame([], File::allFiles(public_path('assets/cases')));
                }
            } else {
                $response->assertCreated();
                $evidence = Evidence::firstOrFail();
                $stored = $evidence->getRawOriginal('img_url');
                $this->assertSame($stored, Arr::get($evidence->metadata, self::PORTRAIT));
                $this->assertSame($stored, Arr::get($evidence->metadata, self::FINGERPRINTS));
                if ($local) {
                    $this->assertSame(base64_decode(self::IMAGE), file_get_contents(public_path($stored)));
                    $this->assertCount(1, File::allFiles(public_path('assets/cases')));
                } else {
                    $this->assertSame($url, $stored);
                }
            }
            $this->assertSame([], Storage::disk('local')->allDirectories('tmp'));
        } finally {
            unlink($bundle);
        }
    }

    public static function storageModes(): array
    {
        return [[true, false], [false, false], [true, true], [false, true]];
    }

    public function test_cleanup_preserves_template_references_until_the_last_image_is_removed(): void
    {
        config(['app.url' => 'https://game.test']);
        $case = GameCase::create(['title' => 'Shared images', 'story' => 'Story', 'XP_on_solve' => 10]);
        $url = "/assets/cases/{$case->id}-shared-images/Evidences/shared.png";
        $unused = "/assets/cases/{$case->id}-shared-images/Evidences/unused.png";
        File::ensureDirectoryExists(dirname(public_path($url)));
        file_put_contents(public_path($url), base64_decode(self::IMAGE));
        file_put_contents(public_path($unused), base64_decode(self::IMAGE));
        $first = Evidence::create(['case_id' => $case->id, 'title' => 'Cover', 'evidence_type' => 'image', 'img_url' => $url]);
        $document = Evidence::create([
            'case_id' => $case->id, 'title' => 'Document', 'evidence_type' => 'document',
            'metadata' => $this->metadata($unused, 'https://game.test'.$url),
        ]);
        $this->deleteJson("/api/admin/evidences/{$first->id}")->assertOk();
        $this->assertFileExists(public_path($url));

        $retained = $document->replicate();
        $retained->save();
        $this->putJson("/api/admin/evidences/{$document->id}", [
            'case_id' => $case->id, 'title' => 'Document', 'evidence_type' => 'document',
            'is_initial' => false, 'is_vital_for_conviction' => false, 'store_locally' => true,
            'metadata' => ['template' => ['id' => 'background_check', 'version' => 1, 'values' => ['subject' => 'No images']]],
        ])->assertOk();
        $this->assertFileExists(public_path($url));
        $this->assertFileExists(public_path($unused));

        $this->putJson("/api/admin/evidences/{$retained->id}", [
            'case_id' => $case->id, 'title' => 'Document', 'evidence_type' => 'document',
            'is_initial' => false, 'is_vital_for_conviction' => false, 'store_locally' => true,
            'metadata' => ['template' => ['id' => 'background_check', 'version' => 1, 'values' => ['subject' => 'With portrait', 'portrait' => $unused]]],
        ])->assertOk();
        $this->assertFileDoesNotExist(public_path($url));
        $this->assertFileExists(public_path($unused));

        $this->deleteJson("/api/admin/evidences/{$retained->id}")->assertOk();
        $this->assertFileDoesNotExist(public_path($url));
        $this->assertFileDoesNotExist(public_path($unused));
    }

    #[DataProvider('remoteImages')]
    public function test_remote_document_images_use_the_existing_export_safeguards(string $cloud, int $limit, bool $succeeds): void
    {
        config(['filesystems.disks.cloudinary.cloud' => 'owned-cloud']);
        config(['case_bundles.max_file_bytes' => $limit]);
        $url = "https://res.cloudinary.com/{$cloud}/image/upload/cases/test/Evidences/image.png";
        $case = GameCase::create(['title' => 'Remote document', 'story' => 'Story', 'XP_on_solve' => 10]);
        Evidence::create([
            'case_id' => $case->id, 'title' => 'Document', 'evidence_type' => 'document',
            'metadata' => $this->metadata($url, $url),
        ]);
        $downloads = [];
        Http::fake(function ($request, array $options) use (&$downloads) {
            $this->assertSame(20, $options['timeout']);
            $this->assertFalse($options['allow_redirects']);
            $this->assertTrue(is_resource($options['sink']));
            $downloads[] = stream_get_meta_data($options['sink'])['uri'];

            return Http::response(base64_decode(self::IMAGE), 200, ['Content-Length' => (string) strlen(base64_decode(self::IMAGE))]);
        });
        $archivesBefore = glob(sys_get_temp_dir().'/case-bundle-*');
        $downloadsBefore = glob(sys_get_temp_dir().'/case_media_*');
        if ($succeeds) {
            $path = app(CaseExportService::class)->export($case);
            try {
                $zip = new ZipArchive;
                $this->assertTrue($zip->open($path));
                $manifest = json_decode($zip->getFromName('case.json'), true);
                $this->assertSame(2, $zip->numFiles);
                $entry = Arr::get($manifest['evidences'][0]['metadata'], self::PORTRAIT);
                $this->assertSame($entry, Arr::get($manifest['evidences'][0]['metadata'], self::FINGERPRINTS));
                $this->assertSame(base64_decode(self::IMAGE), $zip->getFromName($entry));
                $zip->close();
            } finally {
                unlink($path);
            }
        } else {
            $this->getJson("/api/admin/cases/{$case->id}/export")->assertUnprocessable()
                ->assertJsonValidationErrors('evidences.0.metadata.'.self::PORTRAIT);
        }
        Http::assertSentCount($cloud === 'owned-cloud' ? 1 : 0);
        foreach ($downloads as $download) {
            $this->assertFileDoesNotExist($download);
        }
        $this->assertSame($archivesBefore, glob(sys_get_temp_dir().'/case-bundle-*'));
        $this->assertSame($downloadsBefore, glob(sys_get_temp_dir().'/case_media_*'));
    }

    public static function remoteImages(): array
    {
        return [
            'approved image' => ['owned-cloud', 1024, true],
            'unowned image' => ['another-cloud', 1024, false],
            'oversized image' => ['owned-cloud', 8, false],
        ];
    }

    private function metadata(string $portrait, mixed $fingerprints): array
    {
        return ['template' => [
            'id' => 'background_check',
            'version' => 1,
            'values' => ['subject' => 'Case subject', 'portrait' => $portrait, 'fingerprints' => $fingerprints],
        ]];
    }
}
