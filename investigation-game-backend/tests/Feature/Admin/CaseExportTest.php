<?php

namespace Tests\Feature\Admin;

use App\Models\GameCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\TestCase;
use ZipArchive;

class CaseExportTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const FIXTURES = __DIR__.'/../../Fixtures/case-bundles';

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsAdmin();
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
