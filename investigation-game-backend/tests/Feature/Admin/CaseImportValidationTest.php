<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\Support\CaseBundleFactory;
use Tests\TestCase;

class CaseImportValidationTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const FIXTURES = __DIR__.'/../../Fixtures/case-bundles';

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsAdmin();
    }

    public function test_missing_title_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        unset($manifest['case']['title']);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.title');
    }

    public function test_missing_story_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        unset($manifest['case']['story']);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.story');
    }

    public function test_missing_xp_on_solve_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        unset($manifest['case']['XP_on_solve']);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.XP_on_solve');
    }

    public function test_invalid_presentation_type_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        $manifest['zones'][0]['levels'][0]['presentation_type'] = 'bogus';

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zones.0.levels.0.presentation_type');
    }

    public function test_zone_map_url_is_rejected(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        $manifest['zones'][0]['map_url'] = '/assets/maps/zone.png';

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zones.0.map_url');
    }

    public function test_missing_media_path_is_rejected(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'evidences' => [
                [
                    'ref_id' => 'ev_missing',
                    'title' => 'Ghost Evidence',
                    'evidence_type' => 'image',
                    'img' => 'media/evidences/does_not_exist.png',
                ],
            ],
        ]);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('evidences.0.img');
    }

    public function test_non_media_asset_reference_is_rejected(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        $manifest['case']['cover'] = 'cover.png';

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.cover');
    }

    public function test_duplicate_title_returns_422(): void
    {
        $this->importBundle(self::FIXTURES.'/minimal.zip')->assertStatus(201);

        $this->importBundle(self::FIXTURES.'/minimal.zip')
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.title');
    }

    public function test_missing_case_json_returns_422(): void
    {
        // A zip whose only entry is media, with no case.json at the root.
        $raw = tempnam(sys_get_temp_dir(), 'no_manifest_').'.zip';
        $zip = new \ZipArchive;
        $zip->open($raw, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('media/cover.png', 'bytes');
        $zip->close();

        $this->importBundle($raw)
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }
}
