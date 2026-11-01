<?php

namespace Tests\Feature;

use App\Events\EncounterGroupUpdated;
use App\Events\ItemsUnlocked;
use App\Events\LevelTransitioned;
use App\Events\LocationInspected;
use App\Events\RequestFiled;
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
use App\Services\InvestigationRequestService;
use App\Services\LocationInspectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ConcludedRoomIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private const EVENTS = [LocationInspected::class, ItemsUnlocked::class, LevelTransitioned::class, EncounterGroupUpdated::class, RequestFiled::class];

    public static function terminalStatuses(): array
    {
        return [['solved'], ['failed']];
    }

    public static function outcomes(): array
    {
        return array_map(fn ($keys) => [$keys], [[], ['unlock_evidence'], ['unlock_levels'], ['character_updates'], ['unlock_location_points'], ['unlock_evidence', 'unlock_levels', 'character_updates', 'unlock_location_points']]);
    }

    private function fixture(array $keys): array
    {
        $user = User::factory()->create(['username' => 'integrity-player']);
        $case = GameCase::create(['title' => 'Integrity', 'story' => 'Story', 'XP_on_solve' => 100, 'max_strikes' => 3]);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $location = $zone->levels()->create(['title' => 'Location', 'details' => 'Details', 'order_index' => 1, 'presentation_type' => 'location', 'is_initial' => true]);
        $lead = $zone->levels()->create(['title' => 'Lead', 'details' => 'Details', 'order_index' => 2, 'presentation_type' => 'interrogation', 'is_initial' => false]);
        $question = $location->questions()->create(['text' => 'Desk', 'order_index' => 1]);
        $point = $question->choices()->create(['text' => 'Hidden point']);
        $evidence = Evidence::create(['case_id' => $case->id, 'title' => 'Proof', 'evidence_type' => 'document']);
        $character = Character::create(['case_id' => $case->id, 'name' => 'Witness']);
        $outcomes = array_intersect_key([
            'unlock_evidence' => [$evidence->id], 'unlock_levels' => [$lead->id],
            'character_updates' => [['id' => $character->id, 'is_unlocked' => true]],
            'unlock_location_points' => [$point->id],
        ], array_flip($keys));
        $choice = $question->choices()->create(['text' => 'Inspect', 'outcomes' => $outcomes]);
        $room = app(GameRoomService::class)->createRoom($case, $user)->value;
        return compact('user', 'case', 'room', 'location', 'lead', 'choice', 'point', 'evidence', 'character');
    }

    private function snapshot(): array
    {
        $tables = ['game_rooms', 'room_inspections', 'room_evidences', 'room_unlocked_levels', 'room_completed_levels', 'room_characters', 'room_unlocked_location_points', 'room_investigation_requests', 'room_filed_requests', 'room_votes', 'room_question_resolutions', 'encounter_groups', 'encounter_group_members', 'encounter_question_voters', 'case_user', 'users'];
        return array_map(fn ($table) => DB::table($table)->get()->toJson(), $tables);
    }

    #[DataProvider('terminalStatuses')]
    public function test_terminal_inspections_preserve_results_history_and_authentication(string $status): void
    {
        ['user' => $user, 'room' => $room, 'choice' => $choice] = $this->fixture(['unlock_evidence', 'unlock_levels', 'character_updates', 'unlock_location_points']);
        $service = app(LocationInspectionService::class);
        $historicalChoice = $choice->question->choices()->create(['text' => 'Previously inspected']);
        $this->assertTrue($service->inspect($room, $historicalChoice->id, $user)->isSuccess);
        $stale = $room->fresh();
        if ($status === 'solved') app(AssessmentService::class)->evaluateFinalVerdict($room, []);
        else app(AssessmentService::class)->failFromEncounterStrikes($room);
        $token = $user->createToken('integrity')->plainTextToken;
        $before = $this->snapshot();
        Event::fake(self::EVENTS);
        foreach ([$historicalChoice, $choice] as $target) {
            $result = $service->inspect($stale, $target->id, $user);
            $this->assertTrue($result->isFailure());
            $this->assertSame('This investigation has already concluded.', $result->errorMessage);
            $this->withToken($token)->postJson("/api/rooms/{$room->id}/inspect", ['choice_id' => $target->id])
                ->assertForbidden()->assertJsonPath('error', 'Inspection Failed')->assertJsonPath('message', $result->errorMessage);
        }
        $this->getJson("/api/rooms/{$room->id}")->assertOk()->assertJsonPath('room.status', $status)->assertJsonCount(1, 'room.inspections');
        $this->getJson('/api/user')->assertOk()->assertJsonPath('id', $user->id);
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame($before, $this->snapshot());
        foreach (self::EVENTS as $event) Event::assertNotDispatched($event);
        $this->postJson("/api/rooms/{$room->id}/leave", ['reason' => 'pagehide'])->assertOk();
        $this->assertSame($before, $this->snapshot());
        $this->postJson("/api/rooms/{$room->id}/leave", ['reason' => 'explicit'])->assertOk();
        $this->assertSame($status, $room->fresh()->status->value);
        $this->assertSame(1, $room->inspections()->count());
        $this->assertSame(0, app(EncounterGroupService::class)->closeForConcludedRoom($room));
    }

    #[DataProvider('terminalStatuses')]
    public function test_other_mutations_and_stale_jobs_cannot_advance_terminal_rooms(string $status): void
    {
        Queue::fake();
        ['user' => $user, 'room' => $room, 'lead' => $lead, 'evidence' => $evidence] = $this->fixture([]);
        $room->unlockedLevels()->attach($lead->id);
        $question = $lead->questions()->create(['text' => 'Question', 'order_index' => 1]);
        $answer = $question->choices()->create(['text' => 'Answer', 'outcomes' => ['gives_strike' => true, 'unlock_evidence' => [$evidence->id]]]);
        $encounters = app(EncounterGroupService::class);
        $group = $encounters->start($room, $lead, $user)->value;
        $encounters->vote($room, $question, $answer->id, $user);
        $deadline = $group->fresh()->finalizes_at->toISOString();
        // Legacy terminal rooms can still have active groups; the room guard must suffice.
        GameRoom::whereKey($room->id)->update(['status' => $status, 'final_stats' => ['xp_gained' => 17]]);
        $this->travel(6)->seconds();
        $before = $this->snapshot();
        Event::fake(self::EVENTS);
        $this->assertTrue($encounters->start($room, $lead, $user)->isFailure());
        $this->assertTrue($encounters->join($room, $group, $user)->isFailure());
        $this->assertTrue($encounters->vote($room, $question, $answer->id, $user)->isFailure());
        $this->assertTrue($encounters->clearVote($room, $question, $user)->isFailure());
        $this->assertTrue(app(InvestigationRequestService::class)->processRequest($room)->isFailure());
        $this->assertTrue(app(AssessmentService::class)->evaluateFinalVerdict($room, [])->isFailure());
        app(AssessmentService::class)->failFromEncounterStrikes($room);
        $job = new FinalizeEncounterQuestion($group->id, $question->id, $deadline);
        $job->handle($encounters);
        $job->handle($encounters);
        $this->assertSame($before, $this->snapshot());
        foreach (self::EVENTS as $event) Event::assertNotDispatched($event);
        $this->assertSame(1, $encounters->closeForConcludedRoom($room));
        $this->assertSame(0, $encounters->closeForConcludedRoom($room));
        $this->assertSame(1, $group->votes()->count());
        $this->assertSame(0, $room->questionResolutions()->count());
    }

    #[DataProvider('outcomes')]
    public function test_active_inspection_outcomes_and_duplicates(array $keys): void
    {
        ['user' => $user, 'room' => $room, 'lead' => $lead, 'choice' => $choice, 'point' => $point, 'evidence' => $evidence, 'character' => $character] = $this->fixture($keys);
        Event::fake(self::EVENTS);
        $service = app(LocationInspectionService::class);
        $result = $service->inspect($room, $choice->id, $user);
        $this->assertTrue($result->isSuccess);
        $this->assertFalse($result->value['duplicate']);
        $this->assertSame(!$keys, (bool) $result->value['inspection']->is_dead_end);
        $this->assertSame(in_array('unlock_evidence', $keys), $room->unlockedEvidences()->whereKey($evidence->id)->exists());
        $this->assertSame(in_array('unlock_levels', $keys), $room->unlockedLevels()->whereKey($lead->id)->exists());
        $this->assertSame(in_array('character_updates', $keys), $room->unlockedCharacters()->whereKey($character->id)->exists());
        $this->assertSame(in_array('unlock_location_points', $keys), DB::table('room_unlocked_location_points')->where('room_id', $room->id)->where('choice_id', $point->id)->exists());
        $before = $this->snapshot();
        $this->assertTrue($service->inspect($room, $choice->id, $user)->value['duplicate']);
        $this->assertSame($before, $this->snapshot());
        Event::assertDispatchedTimes(LocationInspected::class, 1);
        Event::assertDispatchedTimes(ItemsUnlocked::class, $keys ? 1 : 0);
    }
}
