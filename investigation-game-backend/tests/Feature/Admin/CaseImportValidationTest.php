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

    public function test_standard_presentation_type_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        $manifest['zones'][0]['levels'][0]['presentation_type'] = 'standard';

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

    public function test_duplicate_evidence_ref_id_returns_422_with_both_paths(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'evidences' => [
                ['ref_id' => 'ev_knife', 'title' => 'Knife', 'evidence_type' => 'image'],
                ['ref_id' => 'ev_knife', 'title' => 'Second Knife', 'evidence_type' => 'image'],
            ],
        ]);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('evidences.1.ref_id');
    }

    public function test_duplicate_level_ref_id_returns_422_with_exact_path(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'zones' => [
                [
                    'title' => 'Zone',
                    'order_index' => 1,
                    'levels' => [
                        ['ref_id' => 'lvl_same', 'title' => 'First', 'details' => '...', 'order_index' => 1, 'presentation_type' => 'location'],
                        ['ref_id' => 'lvl_same', 'title' => 'Second', 'details' => '...', 'order_index' => 2, 'presentation_type' => 'location'],
                    ],
                ],
            ],
        ]);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zones.0.levels.1.ref_id');
    }

    public function test_duplicate_character_ref_id_is_reported_at_the_second_declaration(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'characters' => [
                ['ref_id' => 'ch_dana', 'name' => 'Dana'],
                ['ref_id' => 'ch_dana', 'name' => 'Dana Double'],
            ],
        ]);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('characters.1.ref_id');

        $this->assertDatabaseMissing('cases', ['title' => 'Factory Case']);
    }

    public function test_unresolved_choice_outcome_reference_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();

        $manifest['zones'][0]['levels'][0]['nodes'][0]['choices'][0]['outcomes'] = [
            'unlock_evidence_refs' => ['ev_typo_id'],
        ];

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zones.0.levels.0.nodes.0.choices.0.outcomes.unlock_evidence_refs.0');

        $this->assertDatabaseMissing('cases', ['title' => 'Factory Case']);
    }

    public function test_unresolved_request_unlock_reference_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'investigation_requests' => [
                ['ref_id' => 'req_lab', 'request_type' => 'dna_test', 'unlocks_evidence_ref' => 'ev_ghost'],
            ],
        ]);

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('investigation_requests.0.unlocks_evidence_ref');
    }

    public function test_unresolved_level_gate_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();

        $manifest['zones'][0]['levels'][0]['required_request_ref'] = 'req_missing';

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zones.0.levels.0.required_request_ref');
    }

    public function test_unresolved_choice_requirement_reference_returns_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();

        $manifest['zones'][0]['levels'][0]['nodes'][0]['choices'][0]['requirements'] = [
            'required_choice_refs' => ['ch_never_declared'],
        ];

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zones.0.levels.0.nodes.0.choices.0.requirements.required_choice_refs.0');
    }

    public function test_all_errors_across_entities_report_together_in_a_single_422(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'evidences' => [
                ['ref_id' => 'ev_bad', 'title' => 'Bogus', 'evidence_type' => 'document', 'metadata' => []],
            ],
            'characters' => [
                ['ref_id' => 'ch_twin', 'name' => 'Twin'],
                ['ref_id' => 'ch_twin', 'name' => 'Twin Two'],
            ],
            'investigation_requests' => [
                ['ref_id' => 'req_x', 'request_type' => 'dna_test', 'unlocks_evidence_ref' => 'ev_unknown'],
            ],
        ]);

        // Also inject an unresolved ref inside a choice outcome.
        $manifest['zones'][0]['levels'][0]['nodes'][0]['choices'][0]['outcomes'] = [
            'unlock_levels_refs' => ['lvl_mistyped'],
        ];

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'evidences.0.metadata',
                'characters.1.ref_id',
                'investigation_requests.0.unlocks_evidence_ref',
                'zones.0.levels.0.nodes.0.choices.0.outcomes.unlock_levels_refs.0',
            ]);

        // Atomicity: a rejected import must not leave partial rows behind.
        $this->assertDatabaseMissing('cases', ['title' => 'Factory Case']);
        $this->assertDatabaseCount('evidences', 0);
        $this->assertDatabaseCount('choices', 0);
    }

    public function test_resolved_refs_import_successfully(): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'evidences' => [
                ['ref_id' => 'ev_note', 'title' => 'Note', 'evidence_type' => 'image'],
            ],
            'characters' => [
                ['ref_id' => 'ch_ana', 'name' => 'Ana'],
            ],
            'investigation_requests' => [
                [
                    'ref_id' => 'req_lab',
                    'request_type' => 'dna_test',
                    'unlocks_evidence_ref' => 'ev_note',
                    'required_evidence_refs' => ['ev_note'],
                    'required_character_refs' => ['ch_ana'],
                ],
            ],
        ]);

        $manifest['zones'][0]['levels'][0]['required_request_ref'] = 'req_lab';
        $manifest['zones'][0]['levels'][0]['nodes'][0]['choices'][0]['outcomes'] = [
            'unlock_evidence_refs' => ['ev_note'],
        ];
        $manifest['zones'][0]['levels'][0]['nodes'][0]['choices'][0]['requirements'] = [
            'required_evidence_refs' => ['ev_note'],
        ];

        $this->importBundle(CaseBundleFactory::build($manifest))->assertStatus(201);
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
