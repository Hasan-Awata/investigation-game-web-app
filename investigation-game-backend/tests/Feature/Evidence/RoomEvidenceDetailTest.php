<?php

namespace Tests\Feature\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\RoomStatus;
use App\Enums\ViewerStrategy;
use App\Http\Resources\EvidenceBoardResource;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;
use App\Services\Evidence\SignatureCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomEvidenceDetailTest extends TestCase
{
    use RefreshDatabase;

    private function roomWith(User $host): GameRoom
    {
        $case = GameCase::factory()->create();

        $room = GameRoom::create([
            'case_id' => $case->id,
            'host_user_id' => $host->id,
            'invite_code' => 'TEST01',
            'status' => RoomStatus::Active,
            'strikes' => 0,
        ]);

        RoomUser::create([
            'room_id' => $room->id,
            'user_id' => $host->id,
            'role' => 'host',
        ]);

        return $room->load('gameCase');
    }

    public function test_it_returns_the_document_for_an_unlocked_evidence(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Ballistics)
            ->create(['case_id' => $room->case_id]);

        $room->unlockedEvidences()->attach($evidence->id);

        $response = $this->actingAs($host)->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}");

        $response->assertOk();
        $response->assertJsonPath('evidence.viewer_strategy', ViewerStrategy::Paper->value);
        $response->assertJsonPath('evidence.paper_finish', PaperFinish::Manila->value);
        $this->assertNotNull($response->json('evidence.content_payload'));
    }

    public function test_the_detail_payload_carries_the_signature_id_lookup(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Document)
            ->create(['case_id' => $room->case_id]);

        $room->unlockedEvidences()->attach($evidence->id);

        $response = $this->actingAs($host)->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}");

        $response->assertOk();

        $paths = $response->json('evidence.signature_paths');

        // A player cannot rebuild the catalog from a filename, so the detail
        // response has to carry the id to path mapping with it.
        $this->assertIsArray($paths);
        $this->assertNotEmpty($paths);

        $catalog = app(SignatureCatalog::class)->all();

        foreach ($paths as $id => $path) {
            $this->assertArrayHasKey('1', $paths, 'Ids must be sequential from 1.');
            $this->assertStringStartsWith('/assets/signatures/', $path);
            $this->assertStringEndsWith('.svg', $path);
        }

        $this->assertSame(
            array_column($catalog, 'path'),
            array_values($paths),
            'The lookup must mirror the catalog exactly, in the same order.'
        );
    }

    public function test_the_detail_payload_is_the_only_place_content_is_served(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Document)
            ->create(['case_id' => $room->case_id]);

        $room->unlockedEvidences()->attach($evidence->id);

        $detail = $this->actingAs($host)
            ->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}")
            ->assertOk()
            ->json('evidence');

        $this->assertArrayHasKey('content_payload', $detail);

        // The board resource is the payload that rides along with every room
        // load, so it must never carry the document.
        $board = EvidenceBoardResource::make($evidence)->resolve();

        $this->assertArrayNotHasKey('content_payload', $board);
        $this->assertArrayNotHasKey('assets', $board);
    }

    public function test_it_404s_for_evidence_the_room_has_not_unlocked(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Document)
            ->create(['case_id' => $room->case_id]);

        // Deliberately not attached to the room.
        $this->actingAs($host)
            ->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}")
            ->assertNotFound();
    }

    public function test_an_unlocked_evidence_from_another_case_still_404s(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);

        $foreign = Evidence::factory()
            ->ofType(EvidenceType::Document)
            ->create(['case_id' => GameCase::factory()->create()->id]);

        $this->actingAs($host)
            ->getJson("/api/rooms/{$room->id}/evidences/{$foreign->id}")
            ->assertNotFound();
    }

    public function test_a_non_member_cannot_read_evidence(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);
        $outsider = User::factory()->create();

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Document)
            ->create(['case_id' => $room->case_id]);

        $room->unlockedEvidences()->attach($evidence->id);

        $this->actingAs($outsider)
            ->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}")
            ->assertForbidden();
    }

    public function test_a_joined_member_may_read_evidence(): void
    {
        $host = User::factory()->create();
        $room = $this->roomWith($host);
        $player = User::factory()->create();

        RoomUser::create([
            'room_id' => $room->id,
            'user_id' => $player->id,
            'role' => 'player',
        ]);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Testimony)
            ->create(['case_id' => $room->case_id]);

        $room->unlockedEvidences()->attach($evidence->id);

        $this->actingAs($player)
            ->getJson("/api/rooms/{$room->id}/evidences/{$evidence->id}")
            ->assertOk();
    }
}
