<?php

namespace Tests\Feature\Admin;

use App\Models\Evidence;
use App\Models\GameCase;
use App\Services\Case\PaperEvidenceConversion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\Feature\Admin\Concerns\ActsAsAdmin;
use Tests\TestCase;

class AdminEvidenceValidationTest extends TestCase
{
    use ActsAsAdmin;
    use RefreshDatabase;

    private GameCase $case;

    private Evidence $evidence;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAdmin();

        $this->case = GameCase::create([
            'title' => 'Evidence Case',
            'story' => 'A test case.',
            'XP_on_solve' => 100,
        ]);

        $this->evidence = Evidence::create([
            'case_id' => $this->case->id,
            'title' => 'Interview notes',
            'evidence_type' => 'testimony',
            'metadata' => ['transcript' => 'Original transcript'],
            'is_initial' => true,
            'is_vital_for_conviction' => false,
        ]);
    }

    public function test_update_preserves_metadata_when_omitted(): void
    {
        $this->putJson("/api/admin/evidences/{$this->evidence->id}", $this->updatePayload())
            ->assertOk();

        $this->assertSame('Original transcript', $this->evidence->fresh()->metadata['transcript']);
    }

    public function test_malformed_metadata_json_is_rejected(): void
    {
        $this->putJson("/api/admin/evidences/{$this->evidence->id}", [
            ...$this->updatePayload(),
            'metadata' => '{not valid json',
        ])->assertUnprocessable()->assertJsonValidationErrors('metadata');
    }

    public function test_non_object_metadata_json_is_rejected(): void
    {
        $this->putJson("/api/admin/evidences/{$this->evidence->id}", [
            ...$this->updatePayload(),
            'metadata' => '["not", "an object"]',
        ])->assertUnprocessable()->assertJsonValidationErrors('metadata');
    }

    public function test_audio_upload_is_rejected_for_non_audio_evidence(): void
    {
        $this->put("/api/admin/evidences/{$this->evidence->id}", [
            ...$this->updatePayload(),
            'audio' => UploadedFile::fake()->create('recording.mp3', 100, 'audio/mpeg'),
        ])->assertUnprocessable()->assertInvalid(['audio']);
    }

    public function test_direct_image_upload_is_rejected_for_document_evidence(): void
    {
        $response = $this->put("/api/admin/evidences/{$this->evidence->id}", [
            ...$this->updatePayload(),
            'evidence_type' => 'document',
            'metadata' => json_encode(['template' => [
                'id' => 'background_check', 'version' => 1, 'values' => ['subject' => 'Case subject'],
            ]]),
            'image' => UploadedFile::fake()->createWithContent('screen.png', base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
            )),
        ]);

        $response->assertUnprocessable()->assertInvalid(['image']);
        $this->assertSame(
            'Direct image uploads are only supported for image and testimony evidence types.',
            $response->json('errors.image.0'),
        );
        $this->assertSame([$response->json('errors.image.0')], $response->json('errors.image'));
        $this->assertSame('testimony', $this->evidence->fresh()->evidence_type->value);
        $this->assertSame('Interview notes', $this->evidence->fresh()->title);
        $this->assertSame(['transcript' => 'Original transcript'], $this->evidence->fresh()->metadata);
    }

    public function test_update_without_evidence_type_validates_metadata_against_existing_type(): void
    {
        $document = Evidence::create([
            'case_id' => $this->case->id,
            'title' => 'Activity record',
            'evidence_type' => 'document',
            'metadata' => ['doc' => ['blocks' => [['type' => 'prose', 'props' => ['html' => 'Text']]]]],
            'is_initial' => true,
            'is_vital_for_conviction' => false,
        ]);

        $payload = $this->updatePayload();
        unset($payload['evidence_type']);

        $this->putJson("/api/admin/evidences/{$document->id}", [
            ...$payload,
            'metadata' => ['doc' => ['blocks' => []]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['metadata.template', 'metadata.doc']);
    }

    public function test_template_save_snapshots_values_and_rejects_legacy_overwrites(): void
    {
        $template = ['id' => 'background_check', 'version' => 1, 'values' => ['subject' => 'ناصر حداد', 'arrests' => [['description' => 'File 41-S']]]];
        $payload = [...$this->updatePayload(), 'evidence_type' => 'forensic', 'metadata' => ['template' => $template]];

        $id = $this->postJson('/api/admin/evidences', $payload)->assertCreated()->json('evidence.id');
        $this->assertSame($template, Evidence::findOrFail($id)->metadata['template']);
        $this->putJson("/api/admin/evidences/{$id}", [...$this->updatePayload(), 'evidence_type' => 'forensic'])->assertOk();
        $this->assertSame($template, Evidence::findOrFail($id)->metadata['template']);

        $legacy = ['doc' => ['blocks' => [['type' => 'prose', 'props' => ['html' => 'Old report']]]]];
        $this->putJson("/api/admin/evidences/{$id}", [...$payload, 'metadata' => $legacy])
            ->assertUnprocessable()->assertJsonValidationErrors('metadata.template');
        $this->assertSame($template, Evidence::findOrFail($id)->metadata['template']);
    }

    public function test_template_validation_reports_nested_fields_and_unmanaged_images(): void
    {
        $payload = [...$this->updatePayload(), 'evidence_type' => 'document'];
        $template = ['id' => 'background_check', 'version' => 1, 'values' => ['birth_date' => '2025-02-29', 'arrests' => [['extra' => 'X']]]];
        $this->postJson('/api/admin/evidences', [...$payload, 'metadata' => ['template' => $template]])
            ->assertUnprocessable()->assertJsonValidationErrors([
                'metadata.template.values.subject', 'metadata.template.values.birth_date',
                'metadata.template.values.arrests.0.description', 'metadata.template.values.arrests.0.extra',
            ]);

        $template['values'] = ['subject' => 'Case subject', 'portrait' => 'https://example.test/portrait.png'];
        $this->postJson('/api/admin/evidences', [...$payload, 'metadata' => ['template' => $template]])
            ->assertUnprocessable()->assertJsonValidationErrors('metadata.template.values.portrait');

        $template['values'] = ['subject' => 'Case subject', 'arrests' => 'not a list'];
        $this->postJson('/api/admin/evidences', [...$payload, 'metadata' => ['template' => $template]])
            ->assertUnprocessable()->assertJsonValidationErrors('metadata.template.values.arrests');
    }

    public function test_background_check_version_two_saves_expanded_fields_and_validates_fingerprint_media(): void
    {
        $template = [
            'id' => 'background_check',
            'version' => 2,
            'values' => [
                'subject' => 'ناصر حداد',
                'aliases' => 'أبو نائل',
                'record_id' => '051H42',
                'arrests' => [[
                    'description' => 'Charge 41-S',
                    'offense_code' => '41-S',
                    'institution' => 'Central Court',
                    'term' => '6 months',
                    'disposition' => 'Released',
                ]],
                'transfer_number' => 'T-791',
            ],
        ];
        $payload = [...$this->updatePayload(), 'evidence_type' => 'document'];
        $id = $this->postJson('/api/admin/evidences', [...$payload, 'metadata' => ['template' => $template]])
            ->assertCreated()->json('evidence.id');
        $this->assertSame($template, Evidence::findOrFail($id)->metadata['template']);

        $template['values']['right_thumb'] = 'https://example.test/thumb.png';
        $this->putJson("/api/admin/evidences/{$id}", [...$payload, 'metadata' => ['template' => $template]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('metadata.template.values.right_thumb');
    }

    public function test_changing_legacy_paper_to_another_type_requires_explicit_metadata(): void
    {
        $metadata = ['doc' => ['blocks' => []]];
        $paper = Evidence::create([
            'case_id' => $this->case->id,
            'title' => 'Legacy report',
            'evidence_type' => 'document',
            'metadata' => $metadata,
            'is_initial' => true,
        ]);

        $this->putJson("/api/admin/evidences/{$paper->id}", $this->updatePayload())
            ->assertUnprocessable()->assertJsonValidationErrors('metadata.template');
        $this->assertSame('document', $paper->fresh()->evidence_type->value);
        $this->assertSame($metadata, $paper->fresh()->metadata);

        $this->putJson("/api/admin/evidences/{$paper->id}", [
            ...$this->updatePayload(), 'metadata' => ['transcript' => 'Reviewed text'],
        ])->assertOk();
        $this->assertSame('testimony', $paper->fresh()->evidence_type->value);
        $this->assertSame(['transcript' => 'Reviewed text'], $paper->fresh()->metadata);
    }

    public function test_reviewed_conversion_dry_runs_and_preserves_evidence_identity(): void
    {
        $document = Evidence::create([
            'case_id' => $this->case->id, 'title' => 'Legacy report', 'evidence_type' => 'document',
            'metadata' => ['doc' => ['blocks' => [['type' => 'prose', 'props' => ['html' => 'Service door 41-S']]]]],
            'is_initial' => true, 'is_vital_for_conviction' => true,
        ]);
        $template = ['id' => 'background_check', 'version' => 1, 'values' => ['subject' => 'Case subject', 'notes' => 'Service door 41-S']];
        $options = ['--case' => (string) $this->case->id, '--reviews' => tempnam(sys_get_temp_dir(), 'review-')];
        $review = ['expected_sha256' => 'stale', 'template' => $template];
        try {
            file_put_contents($options['--reviews'], json_encode([$document->id => $review]));
            $this->artisan('case:convert-paper', [...$options, '--apply' => true])->assertFailed();
            $this->assertArrayHasKey('doc', $document->fresh()->metadata);

            $review['expected_sha256'] = PaperEvidenceConversion::fingerprint($document->metadata);
            file_put_contents($options['--reviews'], json_encode([$document->id => $review]));
            $this->artisan('case:convert-paper', $options)->assertSuccessful();
            $this->assertArrayHasKey('doc', $document->fresh()->metadata);
            $this->artisan('case:convert-paper', [...$options, '--apply' => true])->assertSuccessful();
            $this->artisan('case:convert-paper', [...$options, '--apply' => true])->assertSuccessful();

            $document->refresh();
            $this->assertSame('Legacy report', $document->title);
            $this->assertSame('document', $document->evidence_type->value);
            $this->assertTrue($document->is_initial);
            $this->assertTrue($document->is_vital_for_conviction);
            $this->assertSame(['template' => $template], $document->metadata);
        } finally {
            unlink($options['--reviews']);
        }
    }

    /** @return array<string, mixed> */
    private function updatePayload(): array
    {
        return [
            'case_id' => $this->case->id,
            'title' => 'Interview notes updated',
            'evidence_type' => 'testimony',
            'is_initial' => true,
            'is_vital_for_conviction' => false,
            'store_locally' => false,
        ];
    }
}
