<?php

namespace Tests\Feature\Admin;

use App\Models\Evidence;
use App\Models\GameCase;
use App\Services\Case\CaseBundleMediaResolver;
use App\Services\Case\CaseExportService;
use App\Services\MediaService;
use Cloudinary\Api\Upload\UploadApi;
use Cloudinary\Cloudinary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\TestCase;
use ZipArchive;

class MediaOwnershipTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    #[DataProvider('unsafeLocalUrls')]
    public function test_unowned_urls_cannot_read_or_delete_local_files(string $url): void
    {
        config(['app.url' => 'https://game.test']);
        File::ensureDirectoryExists(public_path('assets/cases/test/Cover'));
        file_put_contents(public_path('marker.png'), 'outside');
        file_put_contents(public_path('assets/marker.png'), 'outside');
        file_put_contents(public_path('assets/cases/test/Cover/owned.png'), 'owned');

        $this->assertNull(app(CaseBundleMediaResolver::class)->archiveLocal($url));
        app(MediaService::class)->delete($url);

        $this->assertFileExists(public_path('marker.png'));
        $this->assertFileExists(public_path('assets/marker.png'));
        $this->assertFileExists(public_path('assets/cases/test/Cover/owned.png'));
    }

    public static function unsafeLocalUrls(): array
    {
        return array_map(fn (string $url) => [$url], [
            '/assets/cases/../../marker.png',
            '/assets/cases/../marker.png',
            '/assets/cases/%2e%2e/marker.png',
            '/assets/cases/..\\marker.png',
            '/assets/marker.png',
            'https://unrelated.test/assets/cases/test/Cover/owned.png',
            '//unrelated.test/assets/cases/test/Cover/owned.png',
            'https://game.test:444/assets/cases/test/Cover/owned.png',
        ]);
    }

    public function test_symlink_escape_cannot_authorize_reads_or_deletes(): void
    {
        File::ensureDirectoryExists(public_path('assets/cases/test'));
        file_put_contents(public_path('marker.png'), 'outside');
        $link = public_path('assets/cases/test/linked.png');
        if (!@symlink(public_path('marker.png'), $link)) {
            $this->markTestSkipped('Creating symlinks requires OS permission.');
        }

        try {
            $url = '/assets/cases/test/linked.png';
            $this->assertNull(app(CaseBundleMediaResolver::class)->archiveLocal($url));
            app(MediaService::class)->delete($url);
            $this->assertFileExists(public_path('marker.png'));
        } finally {
            unlink($link);
        }
    }

    public function test_owned_media_exports_and_is_deleted_only_after_its_last_reference(): void
    {
        config(['app.url' => 'https://game.test']);
        $url = '/assets/cases/test/Cover/owned.png';
        File::ensureDirectoryExists(dirname(public_path($url)));
        file_put_contents(public_path($url), 'owned');
        $case = GameCase::create([
            'title' => 'Shared local media', 'story' => 'Story', 'XP_on_solve' => 10,
            'img_url' => 'https://GAME.test:443' . str_replace('owned', '%6fwned', $url),
        ]);

        $zipPath = app(CaseExportService::class)->export($case);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($zipPath));
        $this->assertSame('owned', $zip->getFromName('media/cover.png'));
        $zip->close();
        unlink($zipPath);

        app(MediaService::class)->delete(ltrim($url, '/'));
        $this->assertFileExists(public_path($url));
        $case->update(['img_url' => null]);
        app(MediaService::class)->delete('https://game.test' . $url);
        $this->assertFileDoesNotExist(public_path($url));
    }

    public function test_shipped_signatures_are_readable_but_never_deleted(): void
    {
        $url = '/assets/signatures/signature-18.svg';
        File::ensureDirectoryExists(dirname(public_path($url)));
        file_put_contents(public_path($url), '<svg/>');

        $this->assertSame(realpath(public_path($url)), app(CaseBundleMediaResolver::class)->archiveLocal($url));
        app(MediaService::class)->delete($url);
        $this->assertFileExists(public_path($url));
    }

    public function test_invalid_same_server_media_does_not_fall_back_to_http(): void
    {
        config(['app.url' => 'https://game.test']);
        Http::fake();
        $case = GameCase::create([
            'title' => 'Invalid cover', 'story' => 'Story', 'XP_on_solve' => 10,
            'img_url' => 'https://game.test/assets/cases/../../marker.png',
        ]);

        $this->actingAsAdmin();
        $this->getJson("/api/admin/cases/{$case->id}/export")->assertUnprocessable()
            ->assertJsonValidationErrors('case.cover');
        Http::assertNothingSent();
    }

    public function test_cloudinary_cleanup_preserves_shared_assets_and_dotted_public_ids(): void
    {
        config(['filesystems.disks.cloudinary.cloud' => 'owned-cloud']);
        $url = 'https://res.cloudinary.com/owned-cloud/video/upload/v123/cases/test/Evidences/voice.part.one.mp3';
        $case = GameCase::create(['title' => 'Cloud media', 'story' => 'Story', 'XP_on_solve' => 10]);
        $evidence = Evidence::create([
            'case_id' => $case->id, 'title' => 'Recording', 'evidence_type' => 'audio',
            'audio_url' => str_replace('/v123/', '/v456/', $url),
        ]);
        $api = Mockery::mock(UploadApi::class);
        $api->shouldReceive('destroy')->once()->with('cases/test/Evidences/voice.part.one', ['resource_type' => 'video'])->andReturn([]);
        $cloudinary = Mockery::mock(Cloudinary::class);
        $cloudinary->shouldReceive('uploadApi')->once()->andReturn($api);
        $this->app->bind(Cloudinary::class, fn () => $cloudinary);

        app(MediaService::class)->delete($url);
        $evidence->delete();
        app(MediaService::class)->delete($url);
    }

    #[DataProvider('unownedCloudinaryUrls')]
    public function test_unrecognized_provider_urls_never_authorize_deletion(string $url): void
    {
        config(['filesystems.disks.cloudinary.cloud' => 'owned-cloud']);
        $this->app->bind(Cloudinary::class, function () {
            $this->fail('Unowned URLs must not construct a provider client.');
        });

        app(MediaService::class)->delete($url);
        $this->assertTrue(true);
    }

    public static function unownedCloudinaryUrls(): array
    {
        return array_map(fn (string $url) => [$url], [
            'https://other.test/owned-cloud/image/upload/cases/test/Cover/id.png',
            'https://res.cloudinary.com/other-cloud/image/upload/cases/test/Cover/id.png',
            'https://res.cloudinary.com/owned-cloud/image/upload/unrelated/id.png',
            'https://res.cloudinary.com/owned-cloud/image/upload/w_100/cases/test/Cover/id.png',
            'http://res.cloudinary.com/owned-cloud/image/upload/cases/test/Cover/id.png',
            'https://res.cloudinary.com/owned-cloud/image/upload/cases/test/Cover/...png',
        ]);
    }

    public function test_evidence_cleanup_preserves_absolute_local_and_metadata_references(): void
    {
        config(['app.url' => 'https://game.test']);
        $this->actingAsAdmin();
        $url = '/assets/cases/test/Evidences/shared.png';
        File::ensureDirectoryExists(dirname(public_path($url)));
        file_put_contents(public_path($url), 'shared');
        $case = GameCase::create(['title' => 'Evidence cleanup', 'story' => 'Story', 'XP_on_solve' => 10]);
        $evidence = Evidence::create([
            'case_id' => $case->id, 'title' => 'Image', 'evidence_type' => 'image', 'img_url' => $url,
        ]);
        $retained = $evidence->replicate();
        $retained->img_url = 'https://game.test' . $url;
        $retained->save();

        $this->putJson("/api/admin/evidences/{$evidence->id}", [
            'case_id' => $case->id, 'title' => 'Image', 'evidence_type' => 'image', 'clear_img' => true,
            'is_initial' => false, 'is_vital_for_conviction' => false, 'store_locally' => true,
        ])->assertOk();
        $this->assertFileExists(public_path($url));

        $retained->update(['img_url' => null, 'metadata' => ['doc' => ['blocks' => [
            ['type' => 'image', 'props' => ['url' => 'https://game.test' . $url]],
        ]]]]);
        $this->deleteJson("/api/admin/evidences/{$evidence->id}")->assertOk();
        app(MediaService::class)->delete($url);
        $this->assertFileExists(public_path($url));
        $this->deleteJson("/api/admin/evidences/{$retained->id}")->assertOk();
        $this->assertFileDoesNotExist(public_path($url));
    }
}
