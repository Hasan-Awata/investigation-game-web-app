<?php

namespace Tests\Feature;

use App\Jobs\FinalizeEncounterQuestion;
use App\Models\Character;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Models\Zone;
use App\Services\AssessmentService;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ConcludedEncounterTest extends TestCase
{
    use RefreshDatabase;

    public function test_replay_rewards_and_best_result_are_preserved(): void
    {
        $host = User::factory()->create(['username' => 'host']);
        $case = GameCase::create(['title' => 'Replay', 'story' => 'Story', 'XP_on_solve' => 100]);
        DB::table('case_user')->insert(['case_id' => $case->id, 'user_id' => $host->id, 'status' => 'failed_strikes', 'created_at' => now(), 'updated_at' => now()]);
        $assessment = app(AssessmentService::class);
        $rooms = app(GameRoomService::class);
        $firstWin = $rooms->createRoom($case, $host)->value;
        $response = $assessment->evaluateFinalVerdict($firstWin, []);
        $this->assertSame(50, $host->fresh()->XP);
        $this->assertSame(50, $response->value['stats']['xp_awards'][$host->id]);
        $this->assertSame(50, $firstWin->fresh()->final_stats['xp_awards'][$host->id]);
        $replay = $rooms->createRoom($case, $host)->value;
        $response = $assessment->evaluateFinalVerdict($replay, []);
        $this->assertSame(0, $response->value['stats']['xp_awards'][$host->id]);
        $this->assertSame(0, $replay->fresh()->final_stats['xp_awards'][$host->id]);
        $this->assertSame(50, $host->fresh()->XP);
        $assessment->failFromEncounterStrikes($rooms->createRoom($case, $host)->value);
        $this->assertDatabaseHas('case_user', ['user_id' => $host->id, 'case_id' => $case->id, 'status' => 'solved_perfect']);
        $this->assertSame(50, $host->fresh()->XP);
    }

    public function test_rejection_preserves_play_and_repair_is_scoped_and_repeatable(): void
    {
        Queue::fake();
        $host = User::factory()->create(['username' => 'host']);
        $case = GameCase::create(['title' => 'Repair', 'story' => 'Story', 'XP_on_solve' => 100, 'max_strikes' => 3]);
        $guilty = Character::create(['case_id' => $case->id, 'name' => 'Guilty', 'is_initial' => true, 'is_guilty' => true]);
        $room = app(GameRoomService::class)->createRoom($case, $host)->value;
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Details', 'order_index' => 1, 'is_initial' => true, 'presentation_type' => 'interrogation']);
        $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
        $choice = $question->choices()->create(['text' => 'Answer']);
        $room->unlockedLevels()->attach($level->id);
        $service = app(EncounterGroupService::class);
        $group = $service->start($room, $level, $host)->value;
        $service->vote($room, $question, $choice->id, $host);
        $before = $group->fresh()->getAttributes();
        $assessment = app(AssessmentService::class);
        $this->assertSame('failed', $assessment->evaluateFinalVerdict($room, [])->value['status']);
        $vital = Evidence::create(['case_id' => $case->id, 'title' => 'Proof', 'evidence_type' => 'document', 'is_vital_for_conviction' => true]);
        $room->unlockedEvidences()->attach($vital->id);
        $this->assertTrue($assessment->evaluateFinalVerdict($room, [$guilty->id], [])->isFailure());
        $hidden = Character::create(['case_id' => $case->id, 'name' => 'Hidden', 'is_guilty' => false]);
        $this->assertTrue($assessment->evaluateFinalVerdict($room, [$hidden->id])->isFailure());
        $this->assertSame($before, $group->fresh()->getAttributes());
        $this->assertSame(0, $service->closeForConcludedRoom($room));
        $this->assertFalse($service->clearVote($room, $question, $host)->isFailure());
        $this->assertFalse($service->vote($room, $question, $choice->id, $host)->isFailure());

        // Reproduce a room concluded by the old code, retaining its stale membership.
        $room->update(['status' => 'solved', 'final_stats' => ['xp_gained' => 100]]);
        $stats = $room->fresh()->getAttributes();
        $this->artisan('encounters:release-concluded')->expectsOutput('Closed 1 encounter groups.')->assertSuccessful();
        $closed = $group->fresh()->getAttributes();
        $this->travel(10)->seconds();
        $this->artisan('encounters:release-concluded')->expectsOutput('Closed 0 encounter groups.')->assertSuccessful();
        $this->assertSame($closed, $group->fresh()->getAttributes());
        $this->assertSame($stats, $room->fresh()->getAttributes());
        $this->assertSame(0, $host->fresh()->XP);
        $this->assertSame(0, DB::table('case_user')->count());
        $this->assertFalse($service->start(app(GameRoomService::class)->createRoom($case, $host)->value, $level, $host)->isFailure());
    }

    public function test_cleanup_failure_rolls_back_verdict_results_and_rewards(): void
    {
        $host = User::factory()->create(['username' => 'host']);
        $case = GameCase::create(['title' => 'Rollback', 'story' => 'Story', 'XP_on_solve' => 100]);
        $room = app(GameRoomService::class)->createRoom($case, $host)->value;
        $encounters = \Mockery::mock(EncounterGroupService::class);
        $encounters->shouldReceive('closeForConcludedRoom')->once()->andThrow(new \RuntimeException('Cleanup failed'));
        try {
            (new AssessmentService($encounters))->evaluateFinalVerdict($room, []);
            $this->fail('Expected cleanup failure');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Cleanup failed', $exception->getMessage());
        }
        $this->assertSame('active', $room->fresh()->status->value);
        $this->assertNull($room->fresh()->final_stats);
        $this->assertSame(0, $host->fresh()->XP);
        $this->assertSame(0, DB::table('case_user')->count());
    }

    public static function outcomes(): array
    {
        return array_map(fn ($outcome) => [$outcome], ['perfect', 'no_crime', 'partial', 'no_proof', 'incomplete', 'strikes', 'no_crime_strikes', 'encounter_strikes']);
    }

    #[DataProvider('outcomes')]
    public function test_terminal_outcomes_release_parallel_groups_and_allow_new_play(string $outcome): void
    {
        Queue::fake();
        $host = User::factory()->create(['username' => 'host']);
        $other = User::factory()->create(['username' => 'other']);
        $case = GameCase::create(['title' => 'Verdict', 'story' => 'Story', 'XP_on_solve' => 100, 'max_strikes' => 1]);
        $guilty = Character::create(['case_id' => $case->id, 'name' => 'Guilty', 'is_initial' => $outcome !== 'incomplete', 'is_guilty' => !in_array($outcome, ['no_crime', 'no_crime_strikes'])]);
        $innocent = Character::create(['case_id' => $case->id, 'name' => 'Innocent', 'is_initial' => true, 'is_guilty' => false]);
        Character::create(['case_id' => $case->id, 'name' => 'Second innocent', 'is_guilty' => false]);
        if ($outcome === 'no_proof') Evidence::create(['case_id' => $case->id, 'title' => 'Missing proof', 'evidence_type' => 'document', 'is_vital_for_conviction' => true]);
        $rooms = app(GameRoomService::class);
        $room = $rooms->createRoom($case, $host)->value;
        $rooms->joinRoom($room->invite_code, $other);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $service = app(EncounterGroupService::class);
        $groups = [];
        $jobs = [];
        $levels = [];
        foreach ([$host, $other] as $index => $player) {
            $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Details', 'order_index' => $index, 'is_initial' => true, 'presentation_type' => 'interrogation']);
            $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
            $choice = $question->choices()->create(['text' => 'Answer', 'outcomes' => ['gives_strike' => true]]);
            $room->unlockedLevels()->attach($level->id);
            $group = $service->start($room, $level, $player)->value;
            $service->vote($room, $question, $choice->id, $player);
            $groups[] = $group;
            $levels[] = $level;
            $jobs[] = new FinalizeEncounterQuestion($group->id, $question->id, $group->fresh()->finalizes_at->toISOString());
        }
        $unrelatedPlayer = User::factory()->create(['username' => 'unrelated']);
        $unrelatedRoom = $rooms->createRoom($case, $unrelatedPlayer)->value;
        $unrelatedGroup = $service->start($unrelatedRoom, $levels[0], $unrelatedPlayer)->value;
        $unrelatedState = $unrelatedGroup->fresh()->getAttributes();
        if ($outcome === 'encounter_strikes') {
            $this->travel(6)->seconds();
            $jobs[0]->handle($service);
        } else {
            $submitted = match ($outcome) {
                'perfect' => [$guilty->id],
                'partial' => [$guilty->id, $innocent->id],
                'no_crime_strikes' => [$innocent->id],
                default => [],
            };
            $this->actingAs($host)->postJson("/api/rooms/{$room->id}/suspects/submit", ['guilty_character_ids' => $submitted])->assertOk();
        }
        $expectedXp = match ($outcome) { 'perfect', 'no_crime' => 100, 'partial' => 50, default => 0 };
        $this->assertSame($expectedXp, $room->fresh()->final_stats['xp_gained']);
        foreach ([$host, $other] as $player) $this->assertSame($expectedXp, $player->fresh()->XP);
        foreach ($groups as $group) {
            $this->assertNotSame('active', $group->fresh()->status);
            $this->assertNull($group->fresh()->active_room_id);
            $this->assertNull($group->fresh()->finalizes_at);
            $this->assertSame(0, $group->members()->whereNull('left_at')->count());
            $this->assertSame(1, $group->members()->count());
            $this->assertSame(1, $group->votes()->count());
        }
        $snapshot = $room->fresh()->getAttributes();
        $history = DB::table('case_user')->orderBy('id')->get()->toJson();
        $this->travel(6)->seconds();
        foreach ($jobs as $job) { $job->handle($service); $job->handle($service); }
        app(AssessmentService::class)->failFromEncounterStrikes($room);
        $this->assertTrue(app(AssessmentService::class)->evaluateFinalVerdict($room, [])->isFailure());
        $this->assertSame(0, $service->closeForConcludedRoom($room));
        $this->assertSame($snapshot, $room->fresh()->getAttributes());
        $this->assertSame($history, DB::table('case_user')->orderBy('id')->get()->toJson());
        $this->assertSame($unrelatedState, $unrelatedGroup->fresh()->getAttributes());
        $this->assertSame(1, $unrelatedGroup->members()->whereNull('left_at')->count());
        $this->assertSame($outcome === 'encounter_strikes' ? 1 : 0, $room->questionResolutions()->count());
        $this->assertSame(0, $room->completedLevels()->count());
        $this->assertSame(0, DB::table('encounter_question_voters')->whereIn('encounter_group_id', collect($groups)->pluck('id'))->whereNull('left_at')->count());
        $newRoom = $rooms->createRoom($case, $host)->value;
        $rooms->joinRoom($newRoom->invite_code, $other);
        $newGroup = $service->start($newRoom, $levels[0], $host);
        $this->assertFalse($newGroup->isFailure());
        $this->assertFalse($service->join($newRoom, $newGroup->value, $other)->isFailure());
        $this->artisan('encounters:release-concluded')->expectsOutput('Closed 0 encounter groups.')->assertSuccessful();
        $this->assertSame(2, $newGroup->value->members()->whereNull('left_at')->count());
    }
}
