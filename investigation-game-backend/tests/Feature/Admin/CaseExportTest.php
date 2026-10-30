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

    public function test_missing_local_media_is_omitted_without_failing_export(): void
    {
        $case = GameCase::create([
            'title' => 'Ghost Media Case',
            'story' => 'Story',
            'XP_on_solve' => 10,
            'img_url' => '/assets/cases/ghost-media-case/Cover/does-not-exist.png',
        ]);

        $zip = $this->openExport($case);

        $manifest = json_decode((string) $zip->getFromName('case.json'), true);

        // The unreachable cover is omitted from the archive and the manifest.
        $this->assertNull($manifest['case']['cover']);
        $this->assertSame(1, $zip->numFiles);

        $zip->close();
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

    private function assertRemoteExportFails(GameCase $case, string $message): void
    {
        $archives = glob(sys_get_temp_dir().'/case-bundle-*');
        $downloads = glob(sys_get_temp_dir().'/case_media_*');

        $this->getJson("/api/admin/cases/{$case->id}/export")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('media')
            ->assertJsonPath('errors.media.0', $message);

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
