<?php

namespace Tests\Feature;

use App\Models\Choice;
use App\Models\EncounterGroupMember;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\Level;
use App\Models\RoomUser;
use App\Models\User;
use App\Models\Zone;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use App\Events\EncounterGroupUpdated;
use App\Http\Controllers\GameRoomController;
use App\Models\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EncounterGroupLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_member_can_start_parallel_groups_and_late_joiner_votes_on_the_next_question(): void
    {
        $starter = User::factory()->create(['username' => fake()->unique()->userName()]);
        $joiner = User::factory()->create(['username' => fake()->unique()->userName()]);
        $parallelStarter = User::factory()->create(['username' => fake()->unique()->userName()]);
        $case = GameCase::create(['title' => 'Group Case', 'story' => 'Story', 'XP_on_solve' => 10]);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $firstLevel = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Interview One',
            'details' => 'Details',
            'order_index' => 1,
            'is_initial' => true,
            'presentation_type' => 'interrogation',
        ]);
        $parallelLevel = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Interview Two',
            'details' => 'Details',
            'order_index' => 2,
            'is_initial' => true,
            'presentation_type' => 'interrogation',
        ]);
        $question = $firstLevel->questions()->create(['order_index' => 1, 'text' => 'Question one']);
        $firstChoice = $question->choices()->create(['text' => 'Answer A']);
        $parallelLevel->questions()->create(['order_index' => 1, 'text' => 'Parallel question']);
        $room = GameRoom::create([
            'case_id' => $case->id,
            'host_user_id' => $starter->id,
            'invite_code' => 'ABC123',
            'status' => 'active',
        ]);
        foreach ([$starter, $joiner, $parallelStarter] as $member) {
            RoomUser::create(['room_id' => $room->id, 'user_id' => $member->id, 'role' => 'participant', 'joined_at' => now()]);
        }
        $room->unlockedLevels()->attach([$firstLevel->id, $parallelLevel->id]);

        $service = app(EncounterGroupService::class);
        $outsider = User::factory()->create(['username' => fake()->unique()->userName()]);
        $unauthorizedStart = $service->start($room, $firstLevel, $outsider);
        $this->assertTrue($unauthorizedStart->isFailure());

        $started = $service->start($room, $firstLevel, $starter);
        $this->assertFalse($started->isFailure());
        $group = $started->value;

        $eventPayload = (new EncounterGroupUpdated($group))->broadcastWith();
        $this->assertSame($question->id, $eventPayload['current_question_id']);
        $this->assertSame([$starter->id], $eventPayload['required_voter_ids']->all());
        $this->assertArrayHasKey('tally', $eventPayload);
        $this->assertArrayHasKey('finalizes_at', $eventPayload);
        $this->assertArrayNotHasKey('outcomes', $eventPayload);

        $duplicateStart = $service->start($room, $firstLevel, $parallelStarter);
        $this->assertTrue($duplicateStart->isFailure(), 'An active group must be joined explicitly.');
        $secondGroupForSamePlayer = $service->start($room, $parallelLevel, $starter);
        $this->assertTrue($secondGroupForSamePlayer->isFailure(), 'A player cannot hold two active group memberships.');

        $joined = $service->join($room, $group, $joiner);
        $this->assertFalse($joined->isFailure());
        $this->assertSame(
            [$starter->id],
            DB::table('encounter_question_voters')->where('encounter_group_id', $group->id)->where('question_id', $question->id)->pluck('user_id')->all()
        );

        EncounterGroupMember::query()->where('encounter_group_id', $group->id)->where('user_id', $joiner->id)
            ->update(['left_at' => now(), 'active_user_id' => null]);
        DB::table('encounter_question_voters')->where('encounter_group_id', $group->id)->where('question_id', $question->id)
            ->where('user_id', $joiner->id)->update(['left_at' => now()]);
        RoomUser::query()->where('room_id', $room->id)->where('user_id', $joiner->id)->delete();
        RoomUser::create(['room_id' => $room->id, 'user_id' => $joiner->id, 'role' => 'participant', 'joined_at' => now()]);

        $roomPayload = app(GameRoomController::class)->show($room->fresh())->getData(true)['room'];
        $snapshotGroup = collect($roomPayload['encounter_groups'])->firstWhere('id', $group->id);
        $this->assertSame([$starter->id], collect($snapshotGroup['members'])->pluck('user_id')->all());

        $vote = $service->vote($room, $question, $firstChoice->id, $starter);
        $this->assertFalse($vote->isFailure());
        $this->assertNotNull($group->fresh()->finalizes_at);

        $lateVote = $service->vote($room, $question, $firstChoice->id, $joiner);
        $this->assertTrue($lateVote->isFailure());

        $parallel = $service->start($room, $parallelLevel, $parallelStarter);
        $this->assertFalse($parallel->isFailure());
        $this->assertSame(2, $room->encounterGroups()->where('status', 'active')->count());
    }

    public function test_duplicate_finalization_jobs_create_only_one_room_resolution(): void
    {
        Queue::fake();
        $fixture = $this->parallelEncounterFixture();
        $service = app(EncounterGroupService::class);
        $group = $service->start($fixture['room'], $fixture['levels'][0], $fixture['players'][0])->value;

        $vote = $service->vote($fixture['room'], $fixture['questions'][0], $fixture['choices'][0]->id, $fixture['players'][0]);
        $this->assertFalse($vote->isFailure());
        $deadline = $group->fresh()->finalizes_at->toISOString();

        $this->travel(6)->seconds();
        $service->finalize($group->fresh(), $fixture['questions'][0]->id, $deadline);
        $service->finalize($group->fresh(), $fixture['questions'][0]->id, $deadline);

        $this->assertSame(1, $fixture['room']->questionResolutions()->where('level_id', $fixture['levels'][0]->id)->count());
        $this->assertSame('completed', $group->fresh()->status);
        $replacement = $service->start($fixture['room']->fresh(), $fixture['levels'][1], $fixture['players'][0]);
        $this->assertFalse($replacement->isFailure());
    }

    public function test_creator_weight_ties_vote_changes_and_clears_control_the_deadline(): void
    {
        Queue::fake();
        $fixture = $this->parallelEncounterFixture();
        $thirdPlayer = User::factory()->create(['username' => fake()->unique()->userName()]);
        RoomUser::create(['room_id' => $fixture['room']->id, 'user_id' => $thirdPlayer->id, 'role' => 'participant', 'joined_at' => now()]);
        $nextQuestion = $fixture['levels'][0]->questions()->create(['order_index' => 2, 'text' => 'Follow-up question']);
        $answerA = $nextQuestion->choices()->create(['text' => 'Answer A']);
        $answerB = $nextQuestion->choices()->create(['text' => 'Answer B']);
        $fixture['choices'][0]->update(['outcomes' => ['next_question_id' => $nextQuestion->id]]);

        $service = app(EncounterGroupService::class);
        $group = $service->start($fixture['room'], $fixture['levels'][0], $fixture['players'][0])->value;
        $this->assertFalse($service->join($fixture['room'], $group, $fixture['players'][1])->isFailure());
        $this->assertFalse($service->join($fixture['room'], $group, $thirdPlayer)->isFailure());
        $service->vote($fixture['room'], $fixture['questions'][0], $fixture['choices'][0]->id, $fixture['players'][0]);
        $firstDeadline = $group->fresh()->finalizes_at->toISOString();
        $this->travel(6)->seconds();
        $service->finalize($group->fresh(), $fixture['questions'][0]->id, $firstDeadline);

        $this->assertSame($nextQuestion->id, $group->fresh()->current_question_id);
        foreach ([
            [$fixture['players'][0], $answerA],
            [$fixture['players'][1], $answerB],
            [$thirdPlayer, $answerB],
        ] as [$player, $choice]) {
            $service->vote($fixture['room'], $nextQuestion, $choice->id, $player);
        }
        $this->assertNull($group->fresh()->finalizes_at, 'Creator weight two against two weight-one votes must remain tied.');

        $this->assertFalse($service->vote($fixture['room'], $nextQuestion, $answerA->id, $thirdPlayer)->isFailure());
        $this->assertNotNull($group->fresh()->finalizes_at, 'Changing a vote to a non-tied result must start a new deadline.');
        $this->assertFalse($service->clearVote($fixture['room'], $nextQuestion, $thirdPlayer)->isFailure());
        $this->assertNull($group->fresh()->finalizes_at, 'Clearing a vote must cancel readiness.');
        $this->assertDatabaseMissing('room_votes', [
            'encounter_group_id' => $group->id,
            'question_id' => $nextQuestion->id,
            'user_id' => $thirdPlayer->id,
        ]);

        $departure = app(GameRoomService::class)->leaveRoom($fixture['room'], $thirdPlayer);
        $this->assertFalse($departure->isFailure());
        $this->assertNotNull($group->fresh()->finalizes_at, 'A departure that leaves a complete non-tied quorum must start the deadline.');
        $this->assertNotNull(DB::table('encounter_question_voters')->where('encounter_group_id', $group->id)
            ->where('question_id', $nextQuestion->id)->where('user_id', $thirdPlayer->id)->value('left_at'));
    }

    public function test_maximum_strikes_fail_parallel_groups_and_stale_jobs_cannot_finalize(): void
    {
        Queue::fake();
        $fixture = $this->parallelEncounterFixture(maxStrikes: 1, firstChoiceOutcomes: ['gives_strike' => true]);
        $service = app(EncounterGroupService::class);
        $firstGroup = $service->start($fixture['room'], $fixture['levels'][0], $fixture['players'][0])->value;
        $parallelGroup = $service->start($fixture['room'], $fixture['levels'][1], $fixture['players'][1])->value;

        $service->vote($fixture['room'], $fixture['questions'][0], $fixture['choices'][0]->id, $fixture['players'][0]);
        $service->vote($fixture['room'], $fixture['questions'][1], $fixture['choices'][1]->id, $fixture['players'][1]);
        $firstDeadline = $firstGroup->fresh()->finalizes_at->toISOString();
        $parallelDeadline = $parallelGroup->fresh()->finalizes_at->toISOString();

        $this->travel(6)->seconds();
        $service->finalize($firstGroup->fresh(), $fixture['questions'][0]->id, $firstDeadline);
        $service->finalize($parallelGroup->fresh(), $fixture['questions'][1]->id, $parallelDeadline);

        $this->assertSame('failed', $fixture['room']->fresh()->status->value);
        $this->assertSame('failed', $firstGroup->fresh()->status);
        $this->assertSame('failed', $parallelGroup->fresh()->status);
        $voteAfterFailure = $service->vote($fixture['room'], $fixture['questions'][1], $fixture['choices'][1]->id, $fixture['players'][1]);
        $this->assertTrue($voteAfterFailure->isFailure());
        $this->assertSame(0, $fixture['room']->questionResolutions()->where('level_id', $fixture['levels'][1]->id)->count());
    }

    /** @return array{room: GameRoom, players: array<int, User>, levels: array<int, Level>, questions: array<int, \App\Models\Question>, choices: array<int, Choice>} */
    private function parallelEncounterFixture(int $maxStrikes = 3, array $firstChoiceOutcomes = []): array
    {
        $players = [User::factory()->create(['username' => fake()->unique()->userName()]), User::factory()->create(['username' => fake()->unique()->userName()])];
        $case = GameCase::create([
            'title' => 'Finalization Case',
            'story' => 'Story',
            'XP_on_solve' => 10,
            'max_strikes' => $maxStrikes,
        ]);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $levels = [];
        $questions = [];
        $choices = [];
        foreach ([1, 2] as $index) {
            $levels[] = Level::create([
                'zone_id' => $zone->id,
                'title' => "Interview {$index}",
                'details' => 'Details',
                'order_index' => $index,
                'is_initial' => true,
                'presentation_type' => 'interrogation',
            ]);
            $questions[] = $levels[$index - 1]->questions()->create(['order_index' => 1, 'text' => "Question {$index}"]);
            $outcomes = $index === 1 ? $firstChoiceOutcomes : [];
            $choices[] = $questions[$index - 1]->choices()->create(['text' => "Answer {$index}", 'outcomes' => $outcomes]);
        }
        $room = GameRoom::create([
            'case_id' => $case->id,
            'host_user_id' => $players[0]->id,
            'invite_code' => 'FIN' . random_int(100, 999),
            'status' => 'active',
        ]);
        foreach ($players as $player) {
            RoomUser::create(['room_id' => $room->id, 'user_id' => $player->id, 'role' => 'participant', 'joined_at' => now()]);
        }
        $room->unlockedLevels()->attach(collect($levels)->pluck('id')->all());

        return compact('room', 'players', 'levels', 'questions', 'choices');
    }
}
