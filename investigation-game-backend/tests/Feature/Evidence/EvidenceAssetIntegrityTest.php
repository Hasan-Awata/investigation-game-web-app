<?php

namespace Tests\Feature\Evidence;

use App\Enums\AssetKind;
use App\Enums\EvidenceType;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Guards the two storage guarantees that application code alone cannot hold:
 * one asset per kind per evidence, and a write that cannot land being reported
 * as a failure rather than as a stored row with a broken path.
 */
class EvidenceAssetIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    private function realImage(string $name = 'scene.png'): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        );

        $path = tempnam(sys_get_temp_dir(), 'ev').'.png';
        file_put_contents($path, $png);

        return new UploadedFile($path, $name, 'image/png', null, true);
    }

    /**
     * @return array<string, mixed>
     */
    private function baseAttributes(GameCase $case): array
    {
        return [
            'case_id' => $case->id,
            'title' => 'Bloodstained Glove',
            'description' => 'Recovered from the scene.',
            'evidence_type' => EvidenceType::Forensic->value,
            'is_initial' => true,
            'is_vital_for_conviction' => false,
        ];
    }

    public function test_the_database_rejects_a_second_asset_of_the_same_kind(): void
    {
        Storage::fake('public');

        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>Body.</p>'],
                        ]],
                    ]],
                ],
                'image' => $this->realImage(),
            ]);

        $response->assertCreated();

        $evidence = Evidence::query()->findOrFail($response->json('evidence.id'));

        $this->assertSame(1, $evidence->assets()->count());

        // The writer's read-then-write can interleave, so the invariant is also
        // asserted at the storage layer rather than trusting the read.
        $this->expectException(QueryException::class);

        $evidence->assets()->create([
            'kind' => AssetKind::Image,
            'disk' => 'public',
            'path' => 'cases/'.$case->id.'/evidences/second.png',
            'mime' => 'image/png',
            'bytes' => 1,
        ]);
    }

    public function test_replacing_an_image_keeps_a_single_row_and_drops_the_old_file(): void
    {
        Storage::fake('public');

        $case = GameCase::factory()->create();

        $create = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>Body.</p>'],
                        ]],
                    ]],
                ],
                'image' => $this->realImage('first.png'),
            ]);

        $create->assertCreated();

        $evidence = Evidence::query()->findOrFail($create->json('evidence.id'));
        $originalPath = $evidence->assets()->sole()->path;

        Storage::disk('public')->assertExists($originalPath);

        $update = $this->actingAs($this->admin())
            ->putJson('/api/admin/evidences/'.$evidence->id, $this->baseAttributes($case) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>Body.</p>'],
                        ]],
                    ]],
                ],
                'image' => $this->realImage('second.png'),
            ]);

        $update->assertOk();

        $evidence->refresh();

        $this->assertSame(1, $evidence->assets()->count());
        $this->assertNotSame($originalPath, $evidence->assets()->sole()->path);

        Storage::disk('public')->assertMissing($originalPath);
        Storage::disk('public')->assertExists($evidence->assets()->sole()->path);
    }

    public function test_a_disk_that_cannot_be_written_reports_a_clean_failure(): void
    {
        Storage::fake('public');

        // Every real disk in filesystems.php sets 'throw' => false, so an
        // unwritable root makes putFileAs() return false instead of throwing.
        // A path underneath a regular file can never be created on any
        // platform, which is a genuine failure rather than a mocked one.
        $blocker = tempnam(sys_get_temp_dir(), 'blk');

        config([
            'filesystems.disks.public.root' => $blocker.DIRECTORY_SEPARATOR.'blocked',
        ]);

        Storage::forgetDisk('public');

        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>Body.</p>'],
                        ]],
                    ]],
                ],
                'image' => $this->realImage(),
            ]);

        $response->assertStatus(500);
        $response->assertJsonPath('message', 'The asset could not be stored. Please retry.');

        // The evidence itself may exist, but it must not have gained an asset
        // row pointing at a file that was never written.
        $this->assertDatabaseMissing('evidence_assets', [
            'evidence_id' => Evidence::query()->value('id'),
            'kind' => AssetKind::Image->value,
        ]);

        @unlink($blocker);
    }
}
