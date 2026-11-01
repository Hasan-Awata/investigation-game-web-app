<?php

namespace Tests\Feature;

use App\Enums\RoomLeaveReason;
use App\Enums\RoomStatus;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Models\Zone;
use App\Services\GameRoomService;
use App\Services\EncounterGroupService;
use App\Jobs\FinalizeEncounterQuestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SoloContinuityTest extends TestCase
{
    use RefreshDatabase;

    private function player(): User
    {
        return User::factory()->create(['username' => fake()->unique()->userName()]);
    }

    private function room(User $host): GameRoom
    {
        $case = GameCase::create(['title' => 'Continuity', 'story' => 'Story', 'is_published' => true, 'XP_on_solve' => 10]);
        return app(GameRoomService::class)->createRoom($case, $host)->value;
    }

    public function test_browser_departure_preserves_progress_and_server_discovery_without_tab_storage(): void
    {
        $host = $this->player();
        $room = $this->room($host);
        $room->update(['strikes' => 1]);
        $this->actingAs($host)->postJson("/api/rooms/{$room->id}/leave", ['reason' => 'pagehide'])->assertOk();
        $this->getJson('/api/cases')->assertOk()->assertJsonPath('cases.0.active_room_invite_code', $room->invite_code);
        $this->postJson('/api/rooms/join', ['invite_code' => $room->invite_code])->assertOk()->assertJsonPath('room.id', $room->id);
        $this->getJson("/api/rooms/{$room->id}")->assertOk()->assertJsonPath('room.strikes', 1)->assertJsonPath('room.status', 'active');
        $this->assertSame(1, $room->users()->count());
    }

    public function test_pending_interrogation_survives_departure_and_duplicate_job_delivery(): void
    {
        Queue::fake();
        $host = $this->player();
        $room = $this->room($host);
        $zone = Zone::create(['case_id' => $room->case_id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Details', 'order_index' => 1, 'is_initial' => true, 'presentation_type' => 'interrogation']);
        $room->unlockedLevels()->attach($level->id);
        $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
        $choice = $question->choices()->create(['text' => 'Answer']);
        $service = app(EncounterGroupService::class);
        $group = $service->start($room, $level, $host)->value;
        $otherRoom = $this->room($host);
        app(GameRoomService::class)->leaveRoom($otherRoom, $host);
        $this->assertSame(1, $group->members()->whereNull('left_at')->count(), 'Leaving another room must not release this encounter.');
        $service->vote($room, $question, $choice->id, $host);
        $deadline = $group->fresh()->finalizes_at->toISOString();
        app(GameRoomService::class)->leaveRoom($room, $host, RoomLeaveReason::PageHide);
        $this->actingAs($host)->getJson("/api/rooms/{$room->id}")->assertOk()->assertJsonPath('room.encounter_groups.0.current_question_id', $question->id);
        $this->assertSame($deadline, $group->fresh()->finalizes_at->toISOString());
        $this->travel(6)->seconds();
        $job = new FinalizeEncounterQuestion($group->id, $question->id, $deadline);
        $job->handle($service);
        $job->handle($service);
        $this->assertSame(1, $room->questionResolutions()->count());
        $this->assertSame('completed', $group->fresh()->status);
        $this->assertSame(RoomStatus::Active, $room->fresh()->status);
    }

    public function test_explicit_exit_releases_encounter_and_prevents_delayed_outcomes(): void
    {
        Queue::fake();
        $host = $this->player();
        $room = $this->room($host);
        $zone = Zone::create(['case_id' => $room->case_id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Details', 'order_index' => 1, 'is_initial' => true, 'presentation_type' => 'interrogation']);
        $room->unlockedLevels()->attach($level->id);
        $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
        $choice = $question->choices()->create(['text' => 'Answer']);
        $service = app(EncounterGroupService::class);
        $group = $service->start($room, $level, $host)->value;
        $service->vote($room, $question, $choice->id, $host);
        $job = new FinalizeEncounterQuestion($group->id, $question->id, $group->fresh()->finalizes_at->toISOString());
        $this->actingAs($host)->postJson("/api/rooms/{$room->id}/leave")->assertOk();
        $this->assertSame('abandoned', $group->fresh()->status);
        $this->assertNull($group->fresh()->finalizes_at);
        $this->assertSame(0, $group->members()->whereNull('left_at')->count());
        $this->travel(6)->seconds();
        $job->handle($service);
        $this->assertSame(0, $room->questionResolutions()->count());
    }

    public function test_multiplayer_migration_then_lone_host_preservation_and_explicit_abandonment(): void
    {
        $host = $this->player();
        $next = $this->player();
        $room = $this->room($host);
        $service = app(GameRoomService::class);
        $service->joinRoom($room->invite_code, $next);
        $service->leaveRoom($room, $host, RoomLeaveReason::PageHide);
        $this->assertSame($next->id, $room->fresh()->host_user_id);
        $service->leaveRoom($room, $next, RoomLeaveReason::PageHide);
        $this->assertSame(1, $room->users()->count());
        $service->leaveRoom($room, $next);
        $this->assertSame(RoomStatus::Failed, $room->fresh()->status);
        $service->leaveRoom($room, $next, RoomLeaveReason::PageHide);
        $this->assertSame(0, $room->users()->count());
    }

    public function test_terminal_status_validation_and_authorization_are_preserved(): void
    {
        $host = $this->player();
        $room = $this->room($host);
        $this->actingAs($this->player())->postJson("/api/rooms/{$room->id}/leave", ['reason' => 'pagehide'])->assertForbidden();
        $this->actingAs($host)->postJson("/api/rooms/{$room->id}/leave", ['reason' => 'unknown'])->assertUnprocessable();
        foreach ([RoomStatus::Solved, RoomStatus::Failed] as $status) {
            $terminal = $this->room($host);
            $terminal->update(['status' => $status]);
            app(GameRoomService::class)->leaveRoom($terminal, $host, RoomLeaveReason::PageHide);
            $this->assertSame(1, $terminal->users()->count());
            app(GameRoomService::class)->leaveRoom($terminal, $host);
            $this->assertSame($status, $terminal->fresh()->status);
        }
    }

    public function test_reads_do_not_extend_existing_retention(): void
    {
        $host = $this->player();
        $room = $this->room($host);
        GameRoom::query()->whereKey($room->id)->update(['updated_at' => now()->subDays(15)]);
        $this->actingAs($host)->getJson("/api/rooms/{$room->id}")->assertOk();
        $this->assertTrue(GameRoom::query()->findOrFail($room->id)->prunable()->whereKey($room->id)->exists());
    }
}

