<?php

namespace Tests\Feature\Evidence;

use App\Enums\EvidenceType;
use App\Enums\RoomStatus;
use App\Events\ItemsUnlocked;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\RoomUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The board listing rides along with every room load and every vote, so it is
 * the widest surface for an accidental document leak. These tests pin that
 * closed rather than trusting review.
 */
class EvidenceBoardLeakTest extends TestCase
{
    use RefreshDatabase;

    private function roomFor(User $user): GameRoom
    {
        $room = GameRoom::create([
            'case_id' => GameCase::factory()->create()->id,
            'host_user_id' => $user->id,
            'invite_code' => 'LEAK01',
            'status' => RoomStatus::Active,
            'strikes' => 0,
        ]);

        RoomUser::create([
            'room_id' => $room->id,
            'user_id' => $user->id,
            'role' => 'host',
        ]);

        return $room;
    }

    public function test_the_room_payload_never_carries_document_content(): void
    {
        $user = User::factory()->create();
        $room = $this->roomFor($user);

        $initial = Evidence::factory()
            ->ofType(EvidenceType::Ballistics)
            ->create(['case_id' => $room->case_id, 'is_initial' => true]);

        $payload = $this->actingAs($user)
            ->getJson("/api/rooms/{$room->id}")
            ->assertOk()
            ->json();

        $this->assertCount(1, $payload['room']['accumulated_evidences']);

        $serialized = json_encode($payload);

        $this->assertStringNotContainsString('content_payload', $serialized);
        $this->assertStringNotContainsString('"pages"', $serialized);
    }

    public function test_unlocking_evidence_still_does_not_ship_its_document(): void
    {
        $user = User::factory()->create();
        $room = $this->roomFor($user);

        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Ballistics)
            ->create(['case_id' => $room->case_id, 'is_initial' => false]);

        $room->unlockedEvidences()->attach($evidence->id);

        $payload = $this->actingAs($user)
            ->getJson("/api/rooms/{$room->id}")
            ->assertOk()
            ->json();

        $this->assertCount(1, $payload['room']['accumulated_evidences']);

        $serialized = json_encode($payload);

        // This is the case that a naive `unlockedEvidences` eager load leaks:
        // the relation is a collection of full Evidence models, so every
        // unlocked document rides along with the room.
        $this->assertStringNotContainsString('content_payload', $serialized);
        $this->assertStringNotContainsString('"pages"', $serialized);

        // The frontend still learns which evidence it holds, as ids only.
        $this->assertSame(
            [$evidence->id],
            $payload['room']['unlocked_evidence_ids']
        );
    }

    public function test_the_room_payload_omits_evidence_the_room_has_not_unlocked(): void
    {
        $user = User::factory()->create();
        $room = $this->roomFor($user);

        Evidence::factory()->ofType(EvidenceType::Document)->create([
            'case_id' => $room->case_id,
            'is_initial' => false,
            'title' => 'SEALED-REPORT',
        ]);

        $payload = $this->actingAs($user)
            ->getJson("/api/rooms/{$room->id}")
            ->assertOk()
            ->json();

        $this->assertSame([], $payload['room']['accumulated_evidences']);
        $this->assertStringNotContainsString('SEALED-REPORT', json_encode($payload));
    }

    public function test_the_room_payload_includes_evidence_unlocked_mid_game(): void
    {
        $user = User::factory()->create();
        $room = $this->roomFor($user);

        $locked = Evidence::factory()->ofType(EvidenceType::Document)->create([
            'case_id' => $room->case_id,
            'is_initial' => false,
            'title' => 'LATER-FIND',
        ]);

        $this->actingAs($user)
            ->getJson("/api/rooms/{$room->id}")
            ->assertOk()
            ->assertJsonCount(0, 'room.accumulated_evidences');

        $room->unlockedEvidences()->attach($locked->id);

        $this->actingAs($user)
            ->getJson("/api/rooms/{$room->id}")
            ->assertOk()
            ->assertJsonCount(1, 'room.accumulated_evidences')
            ->assertJsonPath('room.accumulated_evidences.0.title', 'LATER-FIND');
    }

    public function test_the_unlock_broadcast_carries_board_shaped_evidence(): void
    {
        $user = User::factory()->create();
        $room = $this->roomFor($user);

        $evidence = Evidence::factory()->ofType(EvidenceType::Testimony)->create([
            'case_id' => $room->case_id,
        ]);

        $broadcast = (new ItemsUnlocked(
            $room,
            Evidence::whereKey($evidence->id)->get()
        ))->broadcastWith();

        $this->assertCount(1, $broadcast['unlocked_evidences']);
        $this->assertSame($evidence->id, $broadcast['unlocked_evidences'][0]['id']);
        $this->assertArrayNotHasKey('content_payload', $broadcast['unlocked_evidences'][0]);
    }
}
