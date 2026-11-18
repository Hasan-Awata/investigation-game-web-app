<?php

namespace Tests\Feature;

use App\Enums\RoomStatus;
use App\Events\RoomParticipantRemoved;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Models\Zone;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RoomParticipantRemovalTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{GameCase, GameRoom, User, User, int} */
    private function roomWithMember(): array
    {
        $host = User::factory()->create();
        $member = User::factory()->create();
        $case = GameCase::create(['title' => 'Test case', 'story' => 'Story', 'XP_on_solve' => 100]);
        $service = app(GameRoomService::class);
        $room = $service->createRoom($case, $host)->value;
        $service->joinRoom($room->invite_code, $member);
        $membershipId = $room->users()->where('user_id', $member->id)->firstOrFail()->id;

        return [$case, $room, $host, $member, $membershipId];
    }

    public function test_only_the_current_host_can_remove_another_member_of_an_active_room(): void
    {
        [$case, $room, $host, $member, $membershipId] = $this->roomWithMember();
        $hostMembershipId = $room->users()->where('user_id', $host->id)->firstOrFail()->id;
        $otherRoom = app(GameRoomService::class)->createRoom($case, User::factory()->create())->value;
        $otherMembershipId = $otherRoom->users()->firstOrFail()->id;
        $path = "/api/rooms/{$room->id}/members";

        $this->deleteJson("$path/$membershipId")->assertUnauthorized();
        $this->actingAs(User::factory()->create())->deleteJson("$path/$membershipId")->assertForbidden();
        $this->actingAs($member)->deleteJson("$path/$hostMembershipId")->assertForbidden();
        $this->actingAs($host)->deleteJson("$path/$hostMembershipId")->assertForbidden();
        $this->deleteJson("$path/$otherMembershipId")->assertForbidden();
        $this->deleteJson("$path/99999999999999999999")->assertNotFound();
        $room->update(['status' => RoomStatus::Failed]);
        $this->deleteJson("$path/$membershipId")->assertForbidden();

        $this->assertSame(2, $room->users()->count());
        $this->assertSame(1, $otherRoom->users()->count());
    }

    public function test_removal_revokes_room_access_and_clears_the_members_active_encounter_vote(): void
    {
        Event::fake([RoomParticipantRemoved::class]);
        Queue::fake();
        [$case, $room, $host, $member, $membershipId] = $this->roomWithMember();
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create([
            'title' => 'Interview', 'details' => 'Details', 'order_index' => 1,
            'is_initial' => true, 'presentation_type' => 'interrogation',
        ]);
        $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
        $choice = $question->choices()->create(['text' => 'Answer']);
        $room->unlockedLevels()->attach($level->id);
        $encounters = app(EncounterGroupService::class);
        $start = $encounters->start($room, $level, $member);
        $this->assertTrue($start->isSuccess, $start->errorMessage ?? '');
        $group = $start->value;
        $this->assertTrue($encounters->join($room, $group, $host)->isSuccess);
        $this->assertTrue($encounters->vote($room, $question, $choice->id, $member)->isSuccess);
        $this->assertSame(1, $room->votes()->where('user_id', $member->id)->count());

        $this->actingAs($host)->deleteJson("/api/rooms/{$room->id}/members/{$membershipId}")->assertOk();
        $this->assertSame($host->id, $room->fresh()->host_user_id);
        $this->assertFalse($room->users()->whereKey($membershipId)->exists());
        $this->assertSame('active', $group->fresh()->status);
        $this->assertNotNull($group->members()->where('user_id', $member->id)->firstOrFail()->left_at);
        $this->assertSame(0, $room->votes()->where('user_id', $member->id)->count());
        Event::assertDispatched(RoomParticipantRemoved::class, fn ($event) => $event->roomId === $room->id);
        $this->actingAs($member)->getJson("/api/rooms/{$room->id}")->assertForbidden();
        $this->actingAs($host)->getJson("/api/rooms/{$room->id}")->assertOk()->assertJsonCount(1, 'room.users');
    }
}
