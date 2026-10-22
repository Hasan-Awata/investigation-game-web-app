<?php

namespace Tests\Feature\Admin;

use App\Models\Evidence;
use App\Models\GameCase;
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

    public function test_direct_image_upload_is_rejected_for_terminal_evidence(): void
    {
        $response = $this->put("/api/admin/evidences/{$this->evidence->id}", [
            ...$this->updatePayload(),
            'evidence_type' => 'digital',
            'image' => UploadedFile::fake()->create('screen.png', 100, 'image/png'),
        ]);

        $response->assertUnprocessable()->assertInvalid(['image']);
        $this->assertSame(
            'Direct image uploads are only supported for image, testimony, or physical evidence types.',
            $response->json('errors.image.0'),
        );
    }

    public function test_update_without_evidence_type_validates_metadata_against_existing_type(): void
    {
        $digitalEvidence = Evidence::create([
            'case_id' => $this->case->id,
            'title' => 'Terminal capture',
            'evidence_type' => 'digital',
            'metadata' => ['terminal' => ['blocks' => [['type' => 'prompt_line']]]],
            'is_initial' => true,
            'is_vital_for_conviction' => false,
        ]);

        $payload = $this->updatePayload();
        unset($payload['evidence_type']);

        $this->putJson("/api/admin/evidences/{$digitalEvidence->id}", [
            ...$payload,
            'metadata' => ['terminal' => ['blocks' => []]],
        ])->assertUnprocessable()->assertJsonValidationErrors('metadata');
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
