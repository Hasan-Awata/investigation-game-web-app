<?php

namespace Tests\Feature\Admin;

use App\Models\GameCase;
use App\Support\Case\CaseManifestValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\Support\CaseBundleFactory;
use Tests\TestCase;
use ZipArchive;

class CaseImportValidationTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const FIXTURES = __DIR__.'/../../Fixtures/case-bundles';

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsAdmin();
        Storage::fake('local');
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

    public function test_legacy_case_map_url_is_rejected(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        $manifest['case']['map_url'] = '/Maps/old-map.png';

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.map_url');
    }

    public function test_missing_case_map_media_is_rejected(): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        $manifest['case']['map'] = 'media/map.png';

        $this->importBundle(CaseBundleFactory::build($manifest))
            ->assertStatus(422)
            ->assertJsonValidationErrors('case.map');
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
        $zip = new ZipArchive;
        $zip->open($raw, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('media/cover.png', 'bytes');
        $zip->close();

        $this->importBundle($raw)
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    public function test_explicit_directories_and_exact_limits_import_and_round_trip(): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), [
            'media/unused asset.txt' => str_repeat('a', 4096),
        ]);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));
        $this->assertTrue($zip->addEmptyDir('media'));
        $this->assertTrue($zip->setArchiveComment('An ordinary archive comment'));
        $zip->close();
        $this->assertTrue($zip->open($path));
        $manifestBytes = $zip->statName('case.json')['size'];
        $zip->close();

        config(['case_bundles' => [
            'max_entries' => 3,
            'max_file_bytes' => 4096,
            'max_total_bytes' => $manifestBytes + 4096,
            'max_manifest_bytes' => $manifestBytes,
        ]]);

        try {
            $response = $this->importBundle($path)->assertCreated();
            $case = GameCase::findOrFail($response->json('case_id'));
            $export = $this->get('/api/admin/cases/'.$case->id.'/export')->assertOk();
            $case->delete();
            config(['case_bundles.max_manifest_bytes' => 2 * 1024 * 1024]);
            $this->importBundle($export->baseResponse->getFile()->getPathname())->assertCreated();
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
            if (isset($export)) {
                $export->baseResponse->deleteFileAfterSend(false);
                unlink($export->baseResponse->getFile()->getPathname());
            }
        }
    }

    #[DataProvider('extractionLimits')]
    public function test_extraction_limits_reject_before_manifest_validation(string $limit): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), [
            'media/unused.txt' => str_repeat('a', 8192),
        ]);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));
        $this->assertTrue($zip->addEmptyDir('media'));
        $zip->close();
        $this->assertTrue($zip->open($path));
        $manifestBytes = $zip->statName('case.json')['size'];
        $zip->close();

        config(['case_bundles.'.$limit => match ($limit) {
            'max_entries' => 2,
            'max_file_bytes' => 4096,
            'max_total_bytes' => $manifestBytes + 8191,
            'max_manifest_bytes' => $manifestBytes - 1,
        }]);
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $this->assertLessThan(8192, filesize($path));
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    public static function extractionLimits(): array
    {
        return [
            ['max_entries'], ['max_file_bytes'], ['max_total_bytes'], ['max_manifest_bytes'],
        ];
    }

    #[DataProvider('unsafeEntryNames')]
    public function test_unsafe_and_duplicate_paths_are_rejected(array $entries): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), array_fill_keys($entries, 'unused'));
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    public static function unsafeEntryNames(): array
    {
        return array_map(fn (array $names) => [$names], [
            ['../outside.txt'], ['media/../outside.txt'], ['media\\..\\outside.txt'],
            ['/absolute.txt'], ['C:/absolute.txt'], ['C:relative.txt'], ['\\\\server\\share.txt'],
            ['media/./file.txt'], ['media//file.txt'], ['media/file.txt:stream'],
            ['media/file.txt.'], ['media/file.txt '], ['media/NUL.txt'], ['media/COM1'],
            ['media/LPT¹.txt'], ['media/CONIN$'], ['media/CON .txt'],
            ["media/control\x01.txt"], ['media/file?.txt'],
            ['media/file.txt', 'MEDIA/FILE.TXT'], ['media/file.txt', 'media\\file.txt'],
            ['media/path', 'media/path/'],
        ]);
    }

    #[DataProvider('unsupportedEntryTypes')]
    public function test_links_and_special_entries_are_rejected(int $mode, int $opsys = ZipArchive::OPSYS_UNIX): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), ['media/link' => 'target']);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));
        $this->assertTrue($zip->setExternalAttributesName('media/link', $opsys, $mode << 16));
        $zip->close();
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    public static function unsupportedEntryTypes(): array
    {
        return [
            [0120777], [0010644], [0020644], [0060644], [0140644],
            [0120777, ZipArchive::OPSYS_OS_X], [0120777, ZipArchive::OPSYS_DOS],
        ];
    }

    public function test_write_failure_removes_partial_extraction_before_validation(): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), [
            'media/blocked' => 'already extracted',
            'media/blocked/child.txt' => 'cannot be written',
        ]);
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $response = $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertSame('The ZIP archive could not be extracted.', $response->json('errors.file.0'));
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    public function test_corrupt_entry_removes_partial_extraction_before_validation(): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), [
            'media/corrupt.txt' => str_repeat('corrupt me', 1024),
        ]);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));
        $compressed = $zip->getFromName('media/corrupt.txt', 0, ZipArchive::FL_COMPRESSED);
        $zip->close();
        $bytes = file_get_contents($path);
        $offset = strpos($bytes, $compressed);
        $this->assertNotFalse($offset);
        file_put_contents($path, substr_replace($bytes, str_repeat("\xff", strlen($compressed)), $offset, strlen($compressed)));
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    #[DataProvider('forgedEntrySizes')]
    public function test_forged_sizes_are_rejected_while_extracting(int $declaredBytes): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), [
            'media/forged.txt' => str_repeat('a', 8192),
        ]);
        $bytes = file_get_contents($path);
        $centralOffset = strrpos($bytes, "PK\x01\x02");
        $this->assertNotFalse($centralOffset);
        $localOffset = unpack('Voffset', substr($bytes, $centralOffset + 42, 4))['offset'];
        $bytes = substr_replace($bytes, pack('V', $declaredBytes), $centralOffset + 24, 4);
        $bytes = substr_replace($bytes, pack('V', $declaredBytes), $localOffset + 22, 4);
        file_put_contents($path, $bytes);
        config(['case_bundles.max_file_bytes' => $declaredBytes < 8192 ? 4096 : 32768]);
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    public static function forgedEntrySizes(): array
    {
        return [[16], [16384]];
    }

    #[DataProvider('rawEntryNames')]
    public function test_raw_null_bytes_and_identical_duplicates_are_rejected(string $replacement): void
    {
        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest(), [
            'media/first.txt' => 'first',
            'media/other.txt' => 'second',
        ]);
        file_put_contents($path, str_replace('media/other.txt', $replacement, file_get_contents($path)));
        $this->mock(CaseManifestValidator::class)->shouldNotReceive('validate');

        try {
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('cases', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame([], Storage::disk('local')->directories('tmp'));
        } finally {
            unlink($path);
        }
    }

    public static function rawEntryNames(): array
    {
        return [["media/ot\0er.txt"], ['media/first.txt']];
    }

    #[DataProvider('supportedMedia')]
    public function test_supported_media_imports_with_content_derived_extensions(string $filename, string $bytes, bool $audio, string $extension): void
    {
        $manifest = CaseBundleFactory::minimalManifest();
        if ($audio) {
            $manifest['evidences'] = [['title' => 'Recording', 'evidence_type' => 'audio', 'audio' => 'media/'.$filename]];
        } else {
            $manifest['case']['cover'] = 'media/'.$filename;
        }
        $path = CaseBundleFactory::build($manifest, ['media/'.$filename => $bytes]);

        try {
            $response = $this->importBundle($path)->assertCreated();
            $case = GameCase::findOrFail($response->json('case_id'));
            $url = $audio ? $case->evidences()->firstOrFail()->getRawOriginal('audio_url') : $case->getRawOriginal('img_url');
            $this->assertStringEndsWith('.'.$extension, $url);
            $this->assertSame($bytes, file_get_contents(public_path($url)));
        } finally {
            unlink($path);
        }
    }

    public static function supportedMedia(): array
    {
        $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
        $pcm = str_repeat("\0", 800);
        $audio = 'RIFF'.pack('V', 36 + strlen($pcm)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 8000, 8000, 1, 8).'data'.pack('V', strlen($pcm)).$pcm;

        return [['cover.jpg', $image, false, 'png'], ['recording.wav', $audio, true, 'wav']];
    }

    #[DataProvider('rejectedMedia')]
    public function test_unsafe_media_is_rejected_before_storage(string $field, string $filename, string $bytes): void
    {
        $manifest = CaseBundleFactory::minimalManifest([
            'evidences' => [['title' => 'Recording', 'evidence_type' => 'audio']],
            'characters' => [['name' => 'Witness']],
        ]);
        data_set($manifest, $field, 'media/'.$filename);
        $path = CaseBundleFactory::build($manifest, ['media/'.$filename => $bytes]);

        try {
            $this->importBundle($path)->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertDatabaseCount('cases', 0);
            $this->assertDirectoryDoesNotExist(public_path('assets/cases'));
            $this->assertSame([], Storage::disk('local')->allFiles());
        } finally {
            unlink($path);
        }
    }

    public static function rejectedMedia(): array
    {
        [$image, $audio] = self::supportedMedia();
        $wideImage = substr_replace($image[1], pack('N', 4097), 16, 4);
        $wideImage = substr_replace($wideImage, pack('N', crc32(substr($wideImage, 12, 17))), 29, 4);

        return [
            ['case.cover', 'inert.php', '<?php /* inert */'],
            ['case.cover', 'fake.png', 'not an image'],
            ['case.cover', 'page.html', '<html>not an image</html>'],
            ['case.cover', 'vector.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'],
            ['case.cover', 'recording.wav', $audio[1]],
            ['case.cover', 'large.png', $image[1].str_repeat('x', 4096 * 1024)],
            ['case.cover', 'wide.png', $wideImage],
            ['case.map', 'fake.png', 'not an image'],
            ['characters.0.img', 'fake.png', 'not an image'],
            ['zones.0.levels.0.img', 'fake.png', 'not an image'],
            ['zones.0.levels.0.nodes.0.img', 'fake.png', 'not an image'],
            ['evidences.0.img', 'fake.png', 'not an image'],
            ['evidences.0.audio', 'fake.wav', 'not audio'],
            ['evidences.0.audio', 'image.png', $image[1]],
            ['evidences.0.audio', 'large.wav', $audio[1].str_repeat('x', 10240 * 1024)],
        ];
    }
}
