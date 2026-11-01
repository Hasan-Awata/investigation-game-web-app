<?php

namespace Tests\Feature;

use App\Enums\RoomStatus;
use App\Jobs\FinalizeEncounterQuestion;
use App\Models\EncounterGroup;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\Level;
use App\Models\Question;
use App\Models\User;
use App\Models\Zone;
use App\Services\AssessmentService;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use App\Support\Result;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RoomRestartTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{User, GameRoom, Level, Question, EncounterGroup} */
    private function investigation(): array
    {
        Queue::fake();
        $host = $this->player();
        $case = GameCase::create(['title' => 'Restart case', 'story' => 'Story', 'is_published' => true, 'XP_on_solve' => 100]);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Details', 'order_index' => 1, 'is_initial' => true, 'presentation_type' => 'interrogation']);
        $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
        $choice = $question->choices()->create(['text' => 'Answer', 'outcomes' => ['gives_strike' => true]]);
        $room = app(GameRoomService::class)->createRoom($case, $host)->value;
        $service = app(EncounterGroupService::class);
        $group = $service->start($room, $level, $host)->value;
        $service->vote($room, $question, $choice->id, $host);
        return [$host, $room, $level, $question, $group];
    }

    private function player(): User
    {
        return User::factory()->create(['username' => fake()->unique()->userName()]);
    }

    private function restart(GameRoom $source): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/rooms/restart', ['case_id' => $source->case_id, 'invite_code' => $source->invite_code]);
    }

    public function test_restart_discovered_without_tab_storage_releases_lock_and_stale_jobs_without_penalty(): void
    {
        [$host, $source, $level, $question, $group] = $this->investigation();
        $oldJob = new FinalizeEncounterQuestion($group->id, $question->id, $group->fresh()->finalizes_at->toISOString());
        $this->actingAs($host)->postJson("/api/rooms/{$source->id}/leave", ['reason' => 'pagehide'])->assertOk();
        $this->getJson('/api/cases')->assertJsonPath('cases.0.active_room_invite_code', $source->invite_code);
        $response = $this->restart($source)->assertOk();
        $replacement = GameRoom::findOrFail($response->json('room.id'));
        $this->assertNotSame($source->id, $replacement->id);
        $this->assertSame(RoomStatus::Failed, $source->fresh()->status);
        $this->assertSame('abandoned', $group->fresh()->status);
        $this->assertNull($group->fresh()->finalizes_at);
        $this->assertNull($group->fresh()->active_room_id);
        $this->assertSame(0, $group->members()->whereNull('left_at')->count());
        $this->assertSame(1, $group->members()->count());
        $this->assertDatabaseCount('case_user', 0);
        $this->assertSame(0, $host->fresh()->XP);
        $this->getJson('/api/cases')->assertJsonPath('cases.0.active_room_invite_code', $replacement->invite_code);
        $this->postJson("/api/rooms/{$replacement->id}/levels/{$level->id}/start")->assertCreated();
        $this->travel(6)->seconds();
        $oldJob->handle(app(EncounterGroupService::class));
        $oldJob->handle(app(EncounterGroupService::class));
        $this->assertSame(0, $source->questionResolutions()->count());
        $this->assertSame(0, $replacement->questionResolutions()->count());
        $this->assertSame(0, $replacement->fresh()->strikes);
        $this->assertSame(RoomStatus::Active, $replacement->fresh()->status);
        $assessment = app(AssessmentService::class)->evaluateFinalVerdict($replacement, []);
        $this->assertSame(100, $assessment->value['stats']['xp_awards'][$host->id]);
        $this->assertSame(100, $host->fresh()->XP);
    }

    public function test_lost_response_retries_return_the_same_playable_replacement_even_after_progress(): void
    {
        [$host, $source, $level] = $this->investigation();
        $this->actingAs($host);
        $replacementId = $this->restart($source)->assertOk()->json('room.id');
        $this->postJson("/api/rooms/{$replacementId}/levels/{$level->id}/start")->assertCreated();
        $replacement = GameRoom::findOrFail($replacementId);
        $group = $replacement->encounterGroups()->firstOrFail();
        $state = $group->getAttributes();
        $this->restart($source)->assertOk()->assertJsonPath('room.id', $replacementId);
        $this->restart($source)->assertOk()->assertJsonPath('room.id', $replacementId);
        $this->assertDatabaseCount('game_rooms', 2);
        $this->assertDatabaseCount('room_restarts', 1);
        $this->assertSame($state, $group->fresh()->getAttributes());
        $this->assertSame(1, $group->members()->whereNull('left_at')->count());
    }

    public function test_shared_host_restart_migrates_host_and_preserves_others_pending_work(): void
    {
        [$host, $source, $level, $question, $group] = $this->investigation();
        $remaining = $this->player();
        app(GameRoomService::class)->joinRoom($source->invite_code, $remaining);
        app(EncounterGroupService::class)->join($source, $group, $remaining);
        // A next-question voter snapshot represents both players already taking part.
        DB::table('encounter_question_voters')->insert([
            'encounter_group_id' => $group->id, 'question_id' => $question->id,
            'user_id' => $remaining->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        app(EncounterGroupService::class)->vote($source, $question, $question->choices()->firstOrFail()->id, $remaining);
        $oldDeadline = $group->fresh()->finalizes_at->toISOString();
        $this->travel(1)->seconds();
        $replacementId = $this->actingAs($host)->restart($source)->assertOk()->json('room.id');
        $this->assertSame(RoomStatus::Active, $source->fresh()->status);
        $this->assertSame($remaining->id, $source->fresh()->host_user_id);
        $this->assertDatabaseHas('room_users', ['room_id' => $source->id, 'user_id' => $remaining->id, 'role' => 'host']);
        $this->assertDatabaseMissing('room_users', ['room_id' => $source->id, 'user_id' => $host->id]);
        $this->assertSame(1, $group->members()->whereNull('left_at')->count());
        $this->assertDatabaseHas('room_votes', ['encounter_group_id' => $group->id, 'user_id' => $remaining->id]);
        $this->postJson("/api/rooms/{$replacementId}/levels/{$level->id}/start")->assertCreated();
        $this->travel(6)->seconds();
        $service = app(EncounterGroupService::class);
        $service->finalize($group, $question->id, $oldDeadline);
        $this->assertSame(0, $source->questionResolutions()->count(), 'The cancelled deadline cannot resolve a changed roster.');
        $job = new FinalizeEncounterQuestion($group->id, $question->id, $group->fresh()->finalizes_at->toISOString());
        $job->handle($service);
        $job->handle($service);
        $this->assertSame(1, $source->questionResolutions()->count());
        $this->assertSame(0, GameRoom::findOrFail($replacementId)->strikes);
        $this->assertDatabaseCount('case_user', 0);
    }

    public function test_non_host_restart_preserves_host_and_parallel_encounter(): void
    {
        [$host, $source, $level, $question, $group] = $this->investigation();
        $participant = $this->player();
        app(GameRoomService::class)->joinRoom($source->invite_code, $participant);
        $before = $group->fresh()->getAttributes();
        $replacementId = $this->actingAs($participant)->restart($source)->assertOk()->json('room.id');
        $this->assertSame($host->id, $source->fresh()->host_user_id);
        $this->assertSame($before, $group->fresh()->getAttributes());
        $this->assertSame(1, $group->members()->whereNull('left_at')->count());
        $this->postJson("/api/rooms/{$replacementId}/levels/{$level->id}/start")->assertCreated();
        $this->actingAs($host)->getJson("/api/rooms/{$source->id}")->assertOk();
    }

    public function test_restart_validation_and_authorization_leave_the_source_untouched(): void
    {
        [$host, $source, , , $group] = $this->investigation();
        $before = $group->fresh()->getAttributes();
        $this->restart($source)->assertUnauthorized();
        $outsider = $this->player();
        $this->actingAs($outsider)->restart($source)->assertConflict();
        $this->assertTrue(app(GameRoomService::class)->restartRoom($source->gameCase, $source->invite_code, $outsider)->isFailure());
        $this->actingAs($host)->postJson('/api/rooms/restart', [])->assertUnprocessable();
        $otherCase = GameCase::create(['title' => 'Other', 'story' => 'Story', 'XP_on_solve' => 10]);
        $this->postJson('/api/rooms/restart', ['case_id' => $otherCase->id, 'invite_code' => $source->invite_code])->assertConflict();
        $this->assertDatabaseCount('game_rooms', 1);
        $this->assertDatabaseCount('room_restarts', 0);
        $this->assertSame($before, $group->fresh()->getAttributes());
        $this->assertSame(RoomStatus::Active, $source->fresh()->status);
    }

    public function test_an_encounter_in_another_room_is_not_silently_abandoned(): void
    {
        [$host, $otherRoom, , , $group] = $this->investigation();
        $source = app(GameRoomService::class)->createRoom($otherRoom->gameCase, $host)->value;
        $before = $group->fresh()->getAttributes();
        $this->actingAs($host)->restart($source)->assertConflict();
        $this->assertSame($before, $group->fresh()->getAttributes());
        $this->assertSame(RoomStatus::Active, $source->fresh()->status);
        $this->assertDatabaseCount('game_rooms', 2);
        $this->assertDatabaseCount('room_restarts', 0);
    }

    public function test_initialization_failure_rolls_back_departure_pending_vote_and_replacement(): void
    {
        [$host, $source, , , $group] = $this->investigation();
        $before = $group->fresh()->getAttributes();
        $service = \Mockery::mock(GameRoomService::class)->makePartial();
        $service->shouldReceive('createRoom')->once()->andReturnUsing(function (GameCase $case, User $player): Result {
            GameRoom::create(['case_id' => $case->id, 'host_user_id' => $player->id, 'invite_code' => 'FAILED', 'status' => 'active']);
            return Result::failure('Initialization failed');
        });
        try {
            $service->restartRoom($source->gameCase, $source->invite_code, $host);
            $this->fail('Expected initialization failure.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Restart room initialization failed.', $exception->getMessage());
        }
        $this->assertSame(RoomStatus::Active, $source->fresh()->status);
        $this->assertSame($before, $group->fresh()->getAttributes());
        $this->assertSame(1, $source->users()->count());
        $this->assertSame(1, $group->votes()->count());
        $this->assertDatabaseCount('game_rooms', 1);
        $this->assertDatabaseCount('room_restarts', 0);
    }

    public function test_existing_best_result_and_xp_are_preserved_by_restart(): void
    {
        [$host, $source] = $this->investigation();
        DB::table('case_user')->insert(['case_id' => $source->case_id, 'user_id' => $host->id,
            'status' => 'solved_perfect', 'created_at' => now(), 'updated_at' => now()]);
        $host->update(['XP' => 100]);
        $history = DB::table('case_user')->first();
        $replacementId = $this->actingAs($host)->restart($source)->assertOk()->json('room.id');
        $this->assertEquals($history, DB::table('case_user')->first());
        $this->assertSame(100, $host->fresh()->XP);
        $result = app(AssessmentService::class)->evaluateFinalVerdict(GameRoom::findOrFail($replacementId), []);
        $this->assertSame(0, $result->value['stats']['xp_awards'][$host->id]);
        $this->assertSame(100, $host->fresh()->XP);
    }

    public function test_cleanup_exception_rolls_back_membership_and_pending_vote(): void
    {
        [$host, $source, , , $group] = $this->investigation();
        $before = $group->fresh()->getAttributes();
        $encounters = \Mockery::mock(EncounterGroupService::class);
        $encounters->shouldReceive('membershipDeparted')->once()->andThrow(new \RuntimeException('Cleanup failed'));
        $this->app->instance(EncounterGroupService::class, $encounters);
        try {
            app(GameRoomService::class)->restartRoom($source->gameCase, $source->invite_code, $host);
            $this->fail('Expected cleanup failure.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Cleanup failed', $exception->getMessage());
        }
        $this->assertSame($before, $group->fresh()->getAttributes());
        $this->assertSame(1, $source->users()->count());
        $this->assertSame(1, $group->votes()->count());
        $this->assertSame(RoomStatus::Active, $source->fresh()->status);
        $this->assertDatabaseCount('game_rooms', 1);
        $this->assertDatabaseCount('room_restarts', 0);
    }

    public function test_terminal_and_departed_sources_cannot_be_restarted_or_grant_access_to_another_players_replacement(): void
    {
        [$host, $source] = $this->investigation();
        $participant = $this->player();
        app(GameRoomService::class)->joinRoom($source->invite_code, $participant);
        $replacementId = $this->actingAs($participant)->restart($source)->assertOk()->json('room.id');
        $outsider = $this->player();
        $this->actingAs($outsider)->restart($source)->assertConflict();
        $this->assertFalse(GameRoom::findOrFail($replacementId)->isParticipant($outsider->id));
        $source->update(['status' => RoomStatus::Solved]);
        $this->actingAs($host)->restart($source)->assertConflict();
        $this->assertDatabaseCount('game_rooms', 2);
        $this->assertDatabaseCount('room_restarts', 1);
    }

    public function test_restarting_the_replacement_is_a_new_explicit_operation_and_late_departures_stay_scoped(): void
    {
        [$host, $source, $level] = $this->investigation();
        $this->actingAs($host);
        $first = GameRoom::findOrFail($this->restart($source)->assertOk()->json('room.id'));
        $this->postJson("/api/rooms/{$first->id}/levels/{$level->id}/start")->assertCreated();
        $second = GameRoom::findOrFail($this->restart($first)->assertOk()->json('room.id'));
        $this->postJson("/api/rooms/{$second->id}/levels/{$level->id}/start")->assertCreated();
        $this->postJson("/api/rooms/{$source->id}/leave", ['reason' => 'pagehide'])->assertBadRequest();
        $this->postJson("/api/rooms/{$first->id}/leave", ['reason' => 'pagehide'])->assertBadRequest();
        $this->assertSame(RoomStatus::Active, $second->fresh()->status);
        $this->assertSame(1, $second->encounterGroups()->firstOrFail()->members()->whereNull('left_at')->count());
        $this->assertDatabaseCount('case_user', 0);
        $this->assertDatabaseCount('game_rooms', 3);
    }

    public function test_pruning_the_old_attempt_removes_tracking_and_preserves_the_active_replacement(): void
    {
        [$host, $source, $level] = $this->investigation();
        $this->actingAs($host);
        $replacementId = $this->restart($source)->assertOk()->json('room.id');
        $this->postJson("/api/rooms/{$replacementId}/levels/{$level->id}/start")->assertCreated();
        GameRoom::query()->whereIn('id', [$source->id, $replacementId])->update(['updated_at' => now()->subDays(8)]);
        $this->artisan('model:prune', ['--model' => [GameRoom::class]])->assertSuccessful();
        $this->assertDatabaseMissing('game_rooms', ['id' => $source->id]);
        $this->assertDatabaseCount('room_restarts', 0);
        $replacement = GameRoom::findOrFail($replacementId);
        $this->assertSame(RoomStatus::Active, $replacement->status);
        $this->assertSame(1, $replacement->encounterGroups()->firstOrFail()->members()->whereNull('left_at')->count());
        $this->restart($source)->assertConflict();
        $this->assertDatabaseCount('game_rooms', 1);
    }

    public function test_a_deleted_replacement_does_not_make_an_old_request_create_another_room(): void
    {
        [$host, $source] = $this->investigation();
        $this->actingAs($host);
        $replacementId = $this->restart($source)->assertOk()->json('room.id');
        GameRoom::findOrFail($replacementId)->delete();
        $this->restart($source)->assertConflict();
        $this->assertDatabaseCount('game_rooms', 1);
        $this->assertDatabaseHas('room_restarts', ['source_room_id' => $source->id, 'replacement_room_id' => null]);
    }
}
