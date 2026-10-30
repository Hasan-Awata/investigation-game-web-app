<?php

namespace Tests\Feature\Admin;

use App\Models\Choice;
use App\Models\GameCase;
use App\Services\MediaService;
use Cloudinary\Api\ApiResponse;
use Cloudinary\Api\Upload\UploadApi;
use Cloudinary\Cloudinary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\Support\CaseBundleFactory;
use Tests\TestCase;

class CaseImportCleanupTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAdmin();
        Storage::fake('local');
    }

    public function test_one_image_can_be_shared_across_all_entities_locally(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'case' => ['cover' => 'media/shared.png', 'map' => 'media/shared.png'],
            'evidences' => [['title' => 'Image', 'evidence_type' => 'image', 'img' => 'media/shared.png']],
            'characters' => [['name' => 'Witness', 'img' => 'media/shared.png']],
        ]);
        $manifest['zones'][0]['levels'][0]['img'] = 'media/shared.png';
        $manifest['zones'][0]['levels'][0]['nodes'][0]['img'] = 'media/shared.png';
        $bundle = CaseBundleFactory::build($manifest, ['media/shared.png' => base64_decode(self::IMAGE)]);

        $response = $this->importBundle($bundle)->assertCreated();
        $case = GameCase::findOrFail($response->json('case_id'));
        $url = $case->getRawOriginal('img_url');
        $this->assertSame($url, $case->getRawOriginal('map_url'));
        $this->assertSame($url, $case->evidences()->firstOrFail()->getRawOriginal('img_url'));
        $this->assertSame($url, $case->characters()->firstOrFail()->getRawOriginal('img_url'));
        $level = $case->levels()->firstOrFail();
        $this->assertSame($url, $level->getRawOriginal('img_url'));
        $this->assertSame($url, $level->questions()->firstOrFail()->getRawOriginal('img_url'));
        $this->assertSame(base64_decode(self::IMAGE), file_get_contents(public_path($url)));
        $this->assertCount(1, File::allFiles(public_path('assets/cases')));

        $this->importBundle($bundle)->assertUnprocessable()->assertJsonValidationErrors('case.title');
        $this->assertFileExists(public_path($url));
        $this->assertSame([], Storage::disk('local')->allFiles('tmp'));
    }

    public function test_copying_input_preserves_it_and_only_tracks_new_local_files(): void
    {
        $source = public_path('input.png');
        file_put_contents($source, base64_decode(self::IMAGE));
        $media = app(MediaService::class);
        $existing = $media->storeFromPath($source, 'input.png', 'Existing', 'Cover', true);
        $this->assertFileExists($source);

        $created = [];
        $this->assertSame($existing, $media->storeFromPath($source, 'input.png', 'Existing', 'Cover', true, createdMedia: $created));
        $this->assertSame([], $created);
        $new = $media->storeFromPath($source, 'input.png', 'New', 'Map', true, createdMedia: $created);
        $this->assertSame([$new], $created);
        $media->delete($new);
        $this->assertFileExists(public_path($existing));
        $this->assertFileExists($source);
    }

    public function test_late_failure_rolls_back_the_graph_and_removes_only_new_media(): void
    {
        $existing = '/assets/cases/existing/Cover/keep.png';
        File::ensureDirectoryExists(dirname(public_path($existing)));
        file_put_contents(public_path($existing), 'keep');
        $preserved = GameCase::create(['title' => 'Existing', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => $existing]);
        $fail = true;
        Choice::creating(function () use (&$fail): void {
            if ($fail) {
                throw new \RuntimeException('Injected graph failure');
            }
        });
        $manifest = CaseBundleFactory::minimalManifest([
            'case' => ['cover' => 'media/image.png'],
            'evidences' => [['title' => 'Image', 'evidence_type' => 'image', 'img' => 'media/image.png']],
            'characters' => [['name' => 'Witness', 'img' => 'media/image.png']],
        ]);
        $bundle = CaseBundleFactory::build($manifest, ['media/image.png' => base64_decode(self::IMAGE)]);

        $this->importBundle($bundle)->assertStatus(500);
        $this->assertDatabaseCount('cases', 1);
        foreach (['evidences', 'characters', 'zones', 'levels', 'questions', 'choices'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $this->assertSame($existing, $preserved->fresh()->getRawOriginal('img_url'));
        $this->assertSame('keep', file_get_contents(public_path($existing)));
        $this->assertCount(1, File::allFiles(public_path('assets/cases')));
        $this->assertSame([], Storage::disk('local')->allDirectories('tmp'));

        $fail = false;
        $response = $this->importBundle($bundle)->assertCreated();
        $case = GameCase::findOrFail($response->json('case_id'));
        $this->assertFileExists(public_path($case->getRawOriginal('img_url')));
    }

    public function test_existing_destination_is_rejected_without_changing_its_files(): void
    {
        $path = public_path('assets/cases/1-factory-case/Cover/keep.png');
        File::ensureDirectoryExists(dirname($path));
        file_put_contents($path, 'keep');
        $manifest = CaseBundleFactory::minimalManifest(['case' => ['cover' => 'media/image.png']]);

        $this->importBundle(CaseBundleFactory::build($manifest, ['media/image.png' => base64_decode(self::IMAGE)]))
            ->assertUnprocessable()->assertJsonValidationErrors('media');

        $this->assertDatabaseCount('cases', 0);
        $this->assertSame('keep', file_get_contents($path));
        $this->assertCount(1, File::allFiles(public_path('assets/cases')));
    }

    public function test_local_storage_failure_is_not_treated_as_missing_optional_media(): void
    {
        File::ensureDirectoryExists(public_path('assets'));
        file_put_contents(public_path('assets/cases'), 'obstruction');
        $manifest = CaseBundleFactory::minimalManifest(['case' => ['cover' => 'media/image.png']]);

        $this->importBundle(CaseBundleFactory::build($manifest, ['media/image.png' => base64_decode(self::IMAGE)]))
            ->assertUnprocessable()->assertJsonValidationErrors('media');

        $this->assertDatabaseCount('cases', 0);
        $this->assertSame('obstruction', file_get_contents(public_path('assets/cases')));
    }

    public function test_null_storage_result_fails_the_import(): void
    {
        $this->partialMock(MediaService::class, function (Mockery\MockInterface $mock): void {
            $mock->shouldReceive('storeFromPath')->once()->andReturnNull();
        });
        $manifest = CaseBundleFactory::minimalManifest(['case' => ['cover' => 'media/image.png']]);

        $this->importBundle(CaseBundleFactory::build($manifest, ['media/image.png' => base64_decode(self::IMAGE)]))
            ->assertUnprocessable()->assertJsonValidationErrors('media');

        $this->assertDatabaseCount('cases', 0);
    }

    public function test_shared_cloudinary_input_is_uploaded_once(): void
    {
        $api = Mockery::mock(UploadApi::class);
        $api->shouldReceive('upload')->once()->withArgs(function (string $path, array $options): bool {
            return file_get_contents($path) === base64_decode(self::IMAGE) && $options['overwrite'] === false;
        })->andReturn(new ApiResponse(['secure_url' => 'https://res.cloudinary.com/owned-cloud/image/upload/cases/test/Cover/new.png'], []));
        $cloudinary = Mockery::mock(Cloudinary::class);
        $cloudinary->shouldReceive('uploadApi')->once()->andReturn($api);
        $this->app->bind(Cloudinary::class, fn () => $cloudinary);
        $manifest = CaseBundleFactory::minimalManifest(['case' => ['cover' => 'media/image.png', 'map' => 'media/image.png']]);

        $response = $this->importBundle(CaseBundleFactory::build($manifest, ['media/image.png' => base64_decode(self::IMAGE)]), false)->assertCreated();

        $case = GameCase::findOrFail($response->json('case_id'));
        $this->assertSame($case->getRawOriginal('img_url'), $case->getRawOriginal('map_url'));
    }

    public function test_failed_cloudinary_import_deletes_new_uploads_and_preserves_reused_assets(): void
    {
        $previous = env('CLOUDINARY_CLOUD_NAME');
        Env::getRepository()->set('CLOUDINARY_CLOUD_NAME', 'owned-cloud');
        $this->beforeApplicationDestroyed(fn () => Env::getRepository()->set('CLOUDINARY_CLOUD_NAME', $previous));
        $existing = 'https://res.cloudinary.com/owned-cloud/image/upload/cases/existing/Cover/keep.png';
        GameCase::create(['title' => 'Existing', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => $existing]);
        $api = Mockery::mock(UploadApi::class);
        $api->shouldReceive('upload')->once()->ordered()->andReturn(new ApiResponse(['secure_url' => $existing, 'existing' => true], []));
        $api->shouldReceive('upload')->once()->ordered()->andReturn(new ApiResponse(['secure_url' => 'https://res.cloudinary.com/owned-cloud/image/upload/cases/new/Map/new.png'], []));
        $api->shouldReceive('upload')->once()->ordered()->andThrow(new \RuntimeException('Injected upload failure'));
        $api->shouldReceive('destroy')->once()->with('cases/new/Map/new', ['resource_type' => 'image'])->andReturn(['result' => 'ok']);
        $cloudinary = Mockery::mock(Cloudinary::class);
        $cloudinary->shouldReceive('uploadApi')->times(4)->andReturn($api);
        $this->app->bind(Cloudinary::class, fn () => $cloudinary);
        $manifest = CaseBundleFactory::minimalManifest([
            'case' => ['cover' => 'media/cover.png', 'map' => 'media/map.png'],
            'evidences' => [['title' => 'Image', 'evidence_type' => 'image', 'img' => 'media/evidence.png']],
        ]);

        $this->importBundle(CaseBundleFactory::build($manifest, array_fill_keys(
            ['media/cover.png', 'media/map.png', 'media/evidence.png'], base64_decode(self::IMAGE)
        )), false)->assertStatus(500);

        $this->assertDatabaseCount('cases', 1);
        $this->assertDatabaseCount('evidences', 0);
        $this->assertSame($existing, GameCase::firstOrFail()->getRawOriginal('img_url'));
        $this->assertSame([], Storage::disk('local')->allDirectories('tmp'));
    }

    public function test_cleanup_failure_is_logged_and_does_not_hide_the_import_failure(): void
    {
        Log::spy();
        $this->partialMock(MediaService::class, function (Mockery\MockInterface $mock): void {
            $mock->shouldReceive('delete')->once()->andThrow(new \RuntimeException('Injected cleanup failure'));
        });
        Choice::creating(fn () => throw new \RuntimeException('Injected graph failure'));
        $manifest = CaseBundleFactory::minimalManifest(['case' => ['cover' => 'media/image.png']]);

        $this->importBundle(CaseBundleFactory::build($manifest, ['media/image.png' => base64_decode(self::IMAGE)]))->assertStatus(500);

        $this->assertDatabaseCount('cases', 0);
        Log::shouldHaveReceived('warning')->with('Failed to clean up media from a failed case import.')->once();
        $this->assertSame([], Storage::disk('local')->allDirectories('tmp'));
    }
}
