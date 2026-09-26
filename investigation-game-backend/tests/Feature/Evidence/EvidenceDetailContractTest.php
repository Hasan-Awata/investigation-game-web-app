<?php

namespace Tests\Feature\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Http\Resources\EvidenceDetailResource;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;
use App\Services\Evidence\SignatureCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The detail payload is the only thing the player-side viewers read, so this
 * walks one evidence of every strategy through the real admin write route and
 * back out through the real room detail route, asserting the exact fields
 * PagedViewer, MediaViewer and ArtifactViewer depend on.
 *
 * These shapes are asserted end to end rather than per unit because a
 * response that decodes correctly in isolation can still be re-shaped on the way
 * out by the resource pipeline.
 */
class EvidenceDetailContractTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    private function roomWith(User $host): GameRoom
    {
        $case = GameCase::factory()->create();

        $room = GameRoom::create([
            'case_id' => $case->id,
            'host_user_id' => $host->id,
            'invite_code' => 'SMOKE01',
            'status' => 'active',
            'strikes' => 0,
        ]);

        RoomUser::create(['room_id' => $room->id, 'user_id' => $host->id, 'role' => 'host']);

        return $room->load('gameCase');
    }

    private function realImage(string $name = 'scene.png'): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        );

        return UploadedFile::fake()->createWithContent($name, $png);
    }

    private function pagedPages(): array
    {
        return [[
            'id' => 'page-1',
            'blocks' => [
                ['id' => 'block-1', 'type' => 'text', 'props' => ['html' => '<p>Statement taken.</p>', 'align' => 'left', 'size' => 'body']],
                ['id' => 'block-2', 'type' => 'signature', 'props' => ['signature_id' => 3, 'label' => 'Witness', 'verified' => true]],
                ['id' => 'block-3', 'type' => 'stamp', 'props' => ['text' => 'FILED', 'variant' => 'red', 'rotation' => -8, 'font_size' => 'large']],
            ],
        ]];
    }

    public function test_every_strategy_round_trips_admin_write_to_room_detail(): void
    {
        Storage::fake('public');

        $admin = $this->admin();
        $player = User::factory()->create();
        $room = $this->roomWith($player);

        $paper = $this->actingAs($admin)->postJson('/api/admin/evidences', [
            'case_id' => $room->case_id,
            'evidence_type' => EvidenceType::Ballistics->value,
            'viewer_strategy' => ViewerStrategy::Paper->value,
            'paper_finish' => PaperFinish::Manila->value,
            'title' => 'Ballistics report',
            'is_initial' => true,
            'is_vital_for_conviction' => false,
            'store_locally' => false,
            'content_payload' => ['pages' => $this->pagedPages()],
        ]);
        $paper->assertCreated();

        $terminal = $this->actingAs($admin)->postJson('/api/admin/evidences', [
            'case_id' => $room->case_id,
            'evidence_type' => EvidenceType::Digital->value,
            'viewer_strategy' => ViewerStrategy::Terminal->value,
            'title' => 'Terminal capture',
            'is_initial' => false,
            'is_vital_for_conviction' => false,
            'store_locally' => false,
            'content_payload' => ['pages' => $this->pagedPages()],
        ]);
        $terminal->assertCreated();

        // The frontend now omits paper_finish for non-paper strategies; this
        // asserts the server accepts that exact request body.
        $image = $this->actingAs($admin)->post('/api/admin/evidences', [
            'case_id' => $room->case_id,
            'evidence_type' => EvidenceType::Image->value,
            'viewer_strategy' => ViewerStrategy::Media->value,
            'title' => 'Crime scene photo',
            'is_initial' => false,
            'is_vital_for_conviction' => false,
            'store_locally' => false,
            'image' => $this->realImage(),
        ], ['Accept' => 'application/json']);
        $image->assertCreated();

        $audio = $this->actingAs($admin)->post('/api/admin/evidences', [
            'case_id' => $room->case_id,
            'evidence_type' => EvidenceType::Audio->value,
            'viewer_strategy' => ViewerStrategy::Media->value,
            'title' => 'Tape recording',
            'is_initial' => false,
            'is_vital_for_conviction' => false,
            'store_locally' => false,
            'audio' => UploadedFile::fake()->create('tape.mp3', 64, 'audio/mpeg'),
        ], ['Accept' => 'application/json']);
        $audio->assertCreated();

        $artifact = $this->actingAs($admin)->postJson('/api/admin/evidences', [
            'case_id' => $room->case_id,
            'evidence_type' => EvidenceType::Custom->value,
            'viewer_strategy' => ViewerStrategy::Artifact->value,
            'title' => 'Web page capture',
            'is_initial' => false,
            'is_vital_for_conviction' => false,
            'store_locally' => false,
            'content_payload' => [
                'kind' => 'html',
                'html' => '<h1>Mirror page</h1>',
                'css' => 'h1 { color: red; }',
            ],
        ]);
        $artifact->assertCreated();

        $ids = [
            ViewerStrategy::Paper->value => $paper->json('evidence.id'),
            ViewerStrategy::Terminal->value => $terminal->json('evidence.id'),
            'media_image' => $image->json('evidence.id'),
            'media_audio' => $audio->json('evidence.id'),
            ViewerStrategy::Artifact->value => $artifact->json('evidence.id'),
        ];

        foreach ($ids as $label => $id) {
            $room->unlockedEvidences()->attach($id);
        }

        $detail = $this->actingAs($player)->getJson("/api/rooms/{$room->id}/evidences/{$paper->json('evidence.id')}");
        $detail->assertOk();
        $body = $detail->json('evidence');

        $this->assertSame('paper', $body['viewer_strategy'], 'paper strategy');
        $this->assertSame('manila', $body['paper_finish'], 'paper keeps its finish');
        $this->assertCount(1, $body['content_payload']['pages'], 'paper has pages');
        $this->assertSame('text', $body['content_payload']['pages'][0]['blocks'][0]['type']);
        $this->assertSame('<p>Statement taken.</p>', $body['content_payload']['pages'][0]['blocks'][0]['props']['html']);

        // The id -> path map is server-owned and deliberately not derivable
        // from the id, so this asserts against the catalog rather than a literal.
        $expectedSignaturePath = collect(
            app(SignatureCatalog::class)->all()
        )->firstWhere('id', 3)['path'];

        $this->assertSame(
            $expectedSignaturePath,
            $body['signature_paths']['3'] ?? null,
            'signature block resolves through signature_paths'
        );

        // The lookup must be keyed by id, not positional. Decoding without
        // assoc proves the wire shape is a JSON object: a resource array whose
        // keys are all numeric gets collapsed into a JSON array by the
        // resource pipeline, which would make signature 3 resolve to the
        // fourth signature instead.
        $this->assertSame(
            $expectedSignaturePath,
            json_decode($detail->getContent(), false)->evidence->signature_paths->{'3'},
            'signature_paths is keyed by signature id on the wire'
        );

        $terminalBody = $this->actingAs($player)
            ->getJson("/api/rooms/{$room->id}/evidences/{$terminal->json('evidence.id')}")
            ->assertOk()->json('evidence');
        $this->assertSame('terminal', $terminalBody['viewer_strategy']);
        $this->assertNull($terminalBody['paper_finish'], 'terminal has no paper stock');
        $this->assertCount(1, $terminalBody['content_payload']['pages'], 'terminal has pages');

        $imageBody = $this->actingAs($player)
            ->getJson("/api/rooms/{$room->id}/evidences/{$image->json('evidence.id')}")
            ->assertOk()->json('evidence');
        $this->assertSame('media', $imageBody['viewer_strategy']);
        $this->assertNull($imageBody['content_payload'], 'media carries no payload');
        $this->assertNotEmpty($imageBody['media']['image']['url'], 'MediaViewer gets an image url');
        $this->assertNotEmpty($imageBody['assets'], 'image asset is listed');

        $audioBody = $this->actingAs($player)
            ->getJson("/api/rooms/{$room->id}/evidences/{$audio->json('evidence.id')}")
            ->assertOk()->json('evidence');
        $this->assertSame('media', $audioBody['viewer_strategy']);
        $this->assertNotEmpty($audioBody['media']['audio']['url'], 'MediaViewer gets an audio url');

        $artifactBody = $this->actingAs($player)
            ->getJson("/api/rooms/{$room->id}/evidences/{$artifact->json('evidence.id')}")
            ->assertOk()->json('evidence');
        $this->assertSame('artifact', $artifactBody['viewer_strategy']);
        $this->assertNull($artifactBody['paper_finish'], 'artifact has no paper stock');
        $this->assertSame('html', $artifactBody['content_payload']['kind'], 'ArtifactViewer gets an html kind');
        $this->assertStringContainsString('Mirror page', $artifactBody['content_payload']['html']);
    }

    /**
     * The resource pipeline re-indexes any array whose keys are all numeric,
     * which silently demotes an id-keyed map to a positional one. This pins the
     * resource-level guard so the flag cannot be dropped as unused.
     */
    public function test_the_detail_resource_declares_that_its_keys_are_meaningful(): void
    {
        $resource = new \ReflectionClass(EvidenceDetailResource::class);

        $this->assertTrue(
            $resource->hasProperty('preserveKeys'),
            'the resource declares preserveKeys'
        );
        $this->assertTrue(
            $resource->getProperty('preserveKeys')->getDefaultValue(),
            'preserveKeys is enabled'
        );
    }

    /**
     * A payload row written before the validator returned null holds an empty
     * array. The detail must still report it as null so those documents do not
     * need a data migration to satisfy the contract.
     */
    public function test_a_legacy_empty_payload_row_is_reported_as_null(): void
    {
        $player = User::factory()->create();
        $room = $this->roomWith($player);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Image)
            ->create(['case_id' => $room->case_id]);

        // Written straight to the column, bypassing the write path, to stand in
        // for a row stored by an earlier build.
        DB::table('evidences')->where('id', $evidence->id)->update([
            'content_payload' => '[]',
        ]);

        $room->unlockedEvidences()->attach($evidence->id);

        $body = $this->actingAs($player)
            ->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}")
            ->assertOk()
            ->json('evidence');

        $this->assertNull(
            $body['content_payload'],
            'an empty payload is reported as no payload'
        );
    }
}
