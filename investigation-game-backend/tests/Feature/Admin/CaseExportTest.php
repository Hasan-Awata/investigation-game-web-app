<?php

namespace Tests\Feature\Admin;

use App\Models\Evidence;
use App\Models\GameCase;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Http;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\TestCase;
use ZipArchive;

class CaseExportTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const FIXTURES = __DIR__.'/../../Fixtures/case-bundles';

    private const REMOTE_COVER = 'https://res.cloudinary.com/export-cloud/image/upload/v123/cases/test/Cover/cover.png';

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsAdmin();

        $previousCloud = env('CLOUDINARY_CLOUD_NAME');
        Env::getRepository()->set('CLOUDINARY_CLOUD_NAME', 'export-cloud');
        $this->beforeApplicationDestroyed(fn () => Env::getRepository()->set('CLOUDINARY_CLOUD_NAME', $previousCloud));
        Http::preventStrayRequests();
    }

    public function test_export_of_case_without_media_contains_only_manifest(): void
    {
        $this->importBundle(self::FIXTURES.'/minimal.zip')->assertStatus(201);

        $case = GameCase::where('title', 'Minimal Case')->firstOrFail();

        $zip = $this->openExport($case);

        $this->assertSame(1, $zip->numFiles);
        $this->assertNotFalse($zip->locateName('case.json'));

        $manifest = json_decode((string) $zip->getFromName('case.json'), true);
        $this->assertSame(1, $manifest['format_version']);
        $this->assertSame('Minimal Case', $manifest['case']['title']);
        $this->assertNull($manifest['case']['cover']);

        $zip->close();
    }

    public function test_successful_download_removes_the_completed_archive_after_sending(): void
    {
        $case = GameCase::create(['title' => 'Download cleanup', 'story' => 'Story', 'XP_on_solve' => 10]);
        $response = $this->get("/api/admin/cases/{$case->id}/export")->assertOk()->assertDownload();
        $path = $response->baseResponse->getFile()->getPathname();
        $this->assertFileExists($path);

        ob_start();
        try {
            $response->baseResponse->sendContent();
        } finally {
            ob_end_clean();
        }

        $this->assertFileDoesNotExist($path);
    }

    public function test_export_includes_all_media_and_resolvable_refs(): void
    {
        $response = $this->importBundle(self::FIXTURES.'/full.zip');
        $response->assertStatus(201);

        $case = GameCase::findOrFail($response->json('case_id'));

        $zip = $this->openExport($case);

        // case.json + 7 media assets (cover, 2 evidences, 1 character, 1 level, 2 nodes).
        $this->assertSame(8, $zip->numFiles);

        $manifest = json_decode((string) $zip->getFromName('case.json'), true);
        $this->assertSame(1, $manifest['format_version']);

        $mediaRefs = [];
        $collect = function ($value) use (&$collect, &$mediaRefs) {
            if (is_array($value)) {
                foreach ($value as $item) {
                    $collect($item);
                }

                return;
            }

            if (is_string($value) && str_starts_with($value, 'media/')) {
                $mediaRefs[] = $value;
            }
        };
        $collect($manifest);

        $this->assertNotEmpty($mediaRefs);

        foreach ($mediaRefs as $ref) {
            $this->assertNotFalse($zip->locateName($ref), "Missing archived media entry: {$ref}");
        }

        // No zone copied the case map_url (the column lives on cases).
        foreach ($manifest['zones'] as $zone) {
            $this->assertArrayNotHasKey('map_url', $zone);
        }

        $zip->close();
    }

    public function test_missing_local_media_reports_all_affected_fields_and_removes_the_archive(): void
    {
        $response = $this->importBundle(self::FIXTURES.'/full.zip')->assertCreated();
        $case = GameCase::findOrFail($response->json('case_id'));
        $missing = '/assets/cases/missing/private-file.png';
        $case->update(['map_url' => $missing, 'img_url' => $missing]);
        $case->evidences()->update(['img_url' => $missing, 'audio_url' => $missing]);
        $case->characters()->update(['img_url' => $missing]);
        $level = $case->zones()->firstOrFail()->levels()->firstOrFail();
        $level->update(['img_url' => $missing]);
        $level->questions()->update(['img_url' => $missing]);
        $archives = glob(sys_get_temp_dir().'/case-bundle-*');

        $response = $this->getJson("/api/admin/cases/{$case->id}/export")->assertUnprocessable()
            ->assertJsonValidationErrors([
                'case.map', 'case.cover', 'evidences.0.img', 'evidences.0.audio',
                'evidences.1.img', 'evidences.1.audio', 'characters.0.img',
                'zones.0.levels.0.img', 'zones.0.levels.0.nodes.0.img',
            ]);
        $this->assertStringNotContainsString($missing, $response->getContent());
        $this->assertSame($archives, glob(sys_get_temp_dir().'/case-bundle-*'));
        Http::assertNothingSent();
    }

    public function test_missing_metadata_images_report_their_full_paths(): void
    {
        $case = GameCase::create(['title' => 'Missing document images', 'story' => 'Story', 'XP_on_solve' => 10]);
        $metadata = ['url' => '/assets/cases/missing/image.png', 'doc' => ['blocks' => [
            ['type' => 'two_column', 'props' => ['left' => [
                ['type' => 'image', 'props' => ['url' => '/assets/cases/missing/image.png']],
            ], 'right' => [
                ['type' => 'two_column', 'props' => ['left' => [], 'right' => [
                    ['type' => 'image', 'props' => ['url' => '/assets/cases/missing/image.png']],
                ]]],
            ]]],
        ]]];
        Evidence::create(['case_id' => $case->id, 'title' => 'Document', 'evidence_type' => 'document', 'metadata' => $metadata]);
        $archives = glob(sys_get_temp_dir().'/case-bundle-*');

        $this->getJson("/api/admin/cases/{$case->id}/export")->assertUnprocessable()
            ->assertJsonValidationErrors([
                'evidences.0.metadata.url', 'evidences.0.metadata.doc.blocks.0.props.left.0.props.url',
                'evidences.0.metadata.doc.blocks.0.props.right.0.props.right.0.props.url',
            ]);
        $this->assertSame($archives, glob(sys_get_temp_dir().'/case-bundle-*'));
    }

    public function test_remote_audio_failure_identifies_the_evidence_field_and_cleans_earlier_downloads(): void
    {
        $case = GameCase::create([
            'title' => 'Remote audio failure', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => self::REMOTE_COVER,
        ]);
        $audio = 'https://res.cloudinary.com/export-cloud/video/upload/cases/test/Evidences/audio.wav';
        Evidence::create(['case_id' => $case->id, 'title' => 'Recording', 'evidence_type' => 'audio', 'audio_url' => $audio]);
        Http::fake([self::REMOTE_COVER => Http::response('image'), $audio => Http::response('', 404)]);

        $this->assertRemoteExportFails($case, 'Remote media could not be downloaded.', 'evidences.0.audio');
        Http::assertSentCount(2);
    }

    #[DataProvider('archiveFailures')]
    public function test_archive_failures_never_return_a_download_or_leave_temporary_files(string $failure): void
    {
        $case = GameCase::create([
            'title' => 'Archive failure', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => self::REMOTE_COVER,
        ]);
        Http::fake([self::REMOTE_COVER => Http::response('image')]);
        $archive = Mockery::mock(ZipArchive::class)->makePartial();
        $this->app->instance(ZipArchive::class, $archive);
        if ($failure === 'reopen') {
            $archive->shouldReceive('open')->once()->ordered()->passthru();
            $archive->shouldReceive('open')->once()->ordered()->andReturn(ZipArchive::ER_READ);
        } elseif ($failure === 'close') {
            $archive->shouldReceive('close')->once()->andReturnUsing(function () use ($archive) {
                (new \ReflectionMethod(ZipArchive::class, 'close'))->invoke($archive);

                return false;
            });
        } elseif (str_starts_with($failure, 'missing ')) {
            $entry = $failure === 'missing manifest' ? 'case.json' : 'media/cover.png';
            $archive->shouldReceive('locateName')->with($entry)->once()->andReturn(false);
        } else {
            $archive->shouldReceive($failure)->once()->andReturn(false);
        }

        $archives = glob(sys_get_temp_dir().'/case-bundle-*');
        $downloads = glob(sys_get_temp_dir().'/case_media_*');
        $response = $this->getJson("/api/admin/cases/{$case->id}/export");
        if ($failure === 'addFile') {
            $response->assertUnprocessable()->assertJsonValidationErrors('case.cover');
        } else {
            $response->assertStatus(500)->assertExactJson(['message' => 'The case bundle could not be created. Please try again.']);
        }
        $this->assertSame($archives, glob(sys_get_temp_dir().'/case-bundle-*'));
        $this->assertSame($downloads, glob(sys_get_temp_dir().'/case_media_*'));
    }

    public static function archiveFailures(): array
    {
        return array_map(fn (string $failure) => [$failure], [
            'open', 'addFile', 'addFromString', 'close', 'reopen', 'missing manifest', 'missing media',
        ]);
    }

    public function test_invalid_json_fails_cleanly_and_removes_downloaded_media_and_archive(): void
    {
        $case = GameCase::create([
            'title' => 'Invalid manifest encoding', 'story' => "Invalid UTF-8: \xB1", 'XP_on_solve' => 10, 'img_url' => self::REMOTE_COVER,
        ]);
        Http::fake([self::REMOTE_COVER => Http::response('image')]);
        $archives = glob(sys_get_temp_dir().'/case-bundle-*');
        $downloads = glob(sys_get_temp_dir().'/case_media_*');

        $this->getJson("/api/admin/cases/{$case->id}/export")->assertStatus(500)
            ->assertExactJson(['message' => 'The case bundle could not be created. Please try again.']);

        $this->assertSame($archives, glob(sys_get_temp_dir().'/case-bundle-*'));
        $this->assertSame($downloads, glob(sys_get_temp_dir().'/case_media_*'));
    }

    #[DataProvider('unapprovedRemoteUrls')]
    public function test_unapproved_remote_media_is_rejected_before_requesting(string $url, string $cloud = 'export-cloud'): void
    {
        Env::getRepository()->set('CLOUDINARY_CLOUD_NAME', $cloud);
        Http::fake();
        $case = GameCase::create([
            'title' => 'Unapproved remote media', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => $url,
        ]);

        $this->assertRemoteExportFails($case, 'Remote media URL is not an approved Cloudinary asset.');
        Http::assertNothingSent();
    }

    public static function unapprovedRemoteUrls(): array
    {
        return [
            'loopback' => ['http://127.0.0.1/private.png'],
            'https loopback' => ['https://127.0.0.1/private.png'],
            'IPv6 loopback' => ['https://[::1]/private.png'],
            'unrelated host' => ['https://unrelated.test/image.png'],
            'lookalike host' => [str_replace('res.cloudinary.com', 'res.cloudinary.com.unrelated.test', self::REMOTE_COVER)],
            'other account' => [str_replace('export-cloud', 'other-cloud', self::REMOTE_COVER)],
            'http provider' => [str_replace('https:', 'http:', self::REMOTE_COVER)],
            'credentials' => [str_replace('https://', 'https://user:secret@', self::REMOTE_COVER)],
            'port' => [str_replace('res.cloudinary.com', 'res.cloudinary.com:444', self::REMOTE_COVER)],
            'unrelated folder' => [str_replace('cases/test/Cover', 'unrelated', self::REMOTE_COVER)],
            'transformation' => [str_replace('/upload/', '/upload/w_100/', self::REMOTE_COVER)],
            'traversal' => [str_replace('/Cover/', '/Cover/../', self::REMOTE_COVER)],
            'query string' => [self::REMOTE_COVER.'?redirect=https://unrelated.test'],
            'missing account configuration' => [self::REMOTE_COVER, ''],
        ];
    }

    #[DataProvider('remoteDownloadFailures')]
    public function test_remote_download_failures_return_422_and_remove_temporary_files(string $failure, int $status, array $headers, string $message): void
    {
        config(['case_bundles.max_file_bytes' => 8]);
        $case = GameCase::create([
            'title' => 'Failed remote media', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => self::REMOTE_COVER,
        ]);
        $sink = null;
        $tempPath = null;
        $requests = 0;
        $receivedBody = false;
        $completedTransfer = false;
        Http::fake(function (Request $request, array $options) use ($failure, $status, $headers, &$sink, &$tempPath, &$requests, &$receivedBody, &$completedTransfer) {
            $requests++;
            $sink = $options['sink'];
            $tempPath = stream_get_meta_data($sink)['uri'];

            if ($failure !== 'response') {
                $options['on_headers'](new Response($status, $headers));
            }
            $receivedBody = true;
            fwrite($sink, 'part');

            if ($failure === 'progress') {
                $options['progress'](0, 9, 0, 0);
            }
            if ($failure === 'connection') {
                throw new ConnectionException('Provider credentials must not appear in the response.');
            }
            if ($failure === 'read') {
                throw new \RuntimeException('Internal stream read failure.');
            }

            $completedTransfer = true;

            return Http::response($status === 200 ? '123456789' : 'part', $status, $headers);
        });

        $this->assertRemoteExportFails($case, $message);
        $this->assertSame(1, $requests);
        $this->assertFalse(is_resource($sink));
        $this->assertFileDoesNotExist($tempPath);
        if ($failure === 'headers') {
            $this->assertFalse($receivedBody);
        }
        if ($failure === 'progress') {
            $this->assertFalse($completedTransfer);
        }
    }

    public static function remoteDownloadFailures(): array
    {
        $retrievalError = 'Remote media could not be downloaded.';
        $sizeError = 'Remote media exceeds the maximum allowed file size.';

        return [
            'redirect to loopback' => ['response', 302, ['Location' => 'http://127.0.0.1/private'], $retrievalError],
            'redirect to approved asset' => ['response', 307, ['Location' => self::REMOTE_COVER], $retrievalError],
            'not found' => ['response', 404, [], $retrievalError],
            'provider error' => ['response', 500, [], $retrievalError],
            'connection timeout' => ['connection', 200, [], $retrievalError],
            'read failure' => ['read', 200, [], $retrievalError],
            'declared oversize' => ['headers', 200, ['Content-Length' => '9'], $sizeError],
            'unknown length' => ['progress', 200, [], $sizeError],
            'understated length' => ['progress', 200, ['Content-Length' => '1'], $sizeError],
            'completed file oversize' => ['response', 200, [], $sizeError],
        ];
    }

    public function test_approved_image_and_audio_are_streamed_into_the_export_and_cleaned_up(): void
    {
        $fixture = new ZipArchive;
        $this->assertTrue($fixture->open(self::FIXTURES.'/full.zip'));
        $image = $fixture->getFromName('media/cover.png');
        $audio = $fixture->getFromName('media/evidences/ev_tape.audio.wav');
        $fixture->close();
        $audioUrl = 'https://res.cloudinary.com/export-cloud/video/upload/cases/test/Evidences/voice.part.one.wav';
        config(['case_bundles.max_file_bytes' => strlen($image)]);
        $case = GameCase::create([
            'title' => 'Approved remote media', 'story' => 'Story', 'XP_on_solve' => 10, 'img_url' => self::REMOTE_COVER,
        ]);
        $evidence = Evidence::create([
            'case_id' => $case->id, 'title' => 'Recording', 'evidence_type' => 'audio', 'audio_url' => $audioUrl,
        ]);
        $tempPaths = [];
        $failAudio = false;
        Http::fake(function (Request $request, array $options) use ($image, $audio, $audioUrl, &$tempPaths, &$failAudio) {
            $this->assertSame(20, $options['timeout']);
            $this->assertFalse($options['allow_redirects']);
            $this->assertFalse($options['decode_content']);
            $this->assertTrue(is_resource($options['sink']));
            $tempPaths[] = stream_get_meta_data($options['sink'])['uri'];
            if ($failAudio && $request->url() === $audioUrl) {
                return Http::response('', 500);
            }
            $bytes = $request->url() === $audioUrl ? $audio : $image;
            $headers = ['Content-Length' => (string) strlen($bytes)];
            $options['on_headers'](new Response(200, $headers));
            $options['progress'](strlen($bytes), strlen($bytes), 0, 0);

            return Http::response($bytes, 200, $headers);
        });

        $zip = $this->openExport($case);
        $zipPath = $zip->filename;
        try {
            $this->assertSame($image, $zip->getFromName('media/cover.png'));
            $this->assertSame($audio, $zip->getFromName("media/evidences/ev_{$evidence->id}.audio.wav"));
            Http::assertSentCount(2);
            foreach ($tempPaths as $path) {
                $this->assertFileDoesNotExist($path);
            }
        } finally {
            $zip->close();
            unlink($zipPath);
        }

        $case->update(['map_url' => self::REMOTE_COVER, 'img_url' => $audioUrl]);
        $failAudio = true;
        $this->assertRemoteExportFails($case, 'Remote media could not be downloaded.');
        Http::assertSentCount(4);
    }

    private function assertRemoteExportFails(GameCase $case, string $message, string $field = 'case.cover'): void
    {
        $archives = glob(sys_get_temp_dir().'/case-bundle-*');
        $downloads = glob(sys_get_temp_dir().'/case_media_*');

        $this->getJson("/api/admin/cases/{$case->id}/export")
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field)
            ->assertJsonPath('errors', [$field => [$message]]);

        $this->assertSame($archives, glob(sys_get_temp_dir().'/case-bundle-*'));
        $this->assertSame($downloads, glob(sys_get_temp_dir().'/case_media_*'));
    }

    private function openExport(GameCase $case): ZipArchive
    {
        $response = $this->get("/api/admin/cases/{$case->id}/export");
        $response->assertOk();
        $response->assertDownload();

        $zip = new ZipArchive;
        $opened = $zip->open($response->baseResponse->getFile()->getPathname());

        $this->assertTrue($opened === true, 'Exported bundle is not a valid ZIP.');

        return $zip;
    }
}
