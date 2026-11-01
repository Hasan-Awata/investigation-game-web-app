<?php

namespace Tests\Feature;

use App\Events\ItemsUnlocked;
use App\Jobs\FinalizeEncounterQuestion;
use App\Models\Character;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\User;
use App\Models\Zone;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EncounterQueueDeliveryTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('unlockOutcomes')]
    public function test_database_worker_delivers_the_delayed_answer_and_advances_the_encounter(array $unlockKeys): void
    {
        Event::fake([ItemsUnlocked::class]);
        config(['queue.default' => 'database']);
        $player = User::factory()->create(['username' => 'queue_player']);
        $case = GameCase::create(['title' => 'Queue delivery', 'story' => 'Story', 'XP_on_solve' => 10]);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Details', 'is_initial' => true, 'order_index' => 1, 'presentation_type' => 'interrogation']);
        $first = $level->questions()->create(['text' => 'First question', 'order_index' => 1]);
        $next = $level->questions()->create(['text' => 'Next question', 'order_index' => 2]);
        $answer = $first->choices()->create(['text' => 'Answer', 'outcomes' => ['next_question_id' => $next->id]]);
        $unlockedLevel = $zone->levels()->create(['title' => 'New lead', 'details' => 'Details', 'is_initial' => false, 'order_index' => 2, 'presentation_type' => 'location']);
        $evidence = Evidence::create(['case_id' => $case->id, 'title' => 'Proof', 'evidence_type' => 'document', 'is_initial' => false]);
        $character = Character::create(['case_id' => $case->id, 'name' => 'Witness', 'is_initial' => false]);
        $point = $unlockedLevel->questions()->create(['text' => 'Desk', 'order_index' => 1])->choices()->create(['text' => 'Open drawer']);
        $outcomes = array_intersect_key([
            'unlock_levels' => [$unlockedLevel->id],
            'unlock_evidence' => [$evidence->id],
            'character_updates' => [['id' => $character->id, 'is_unlocked' => true]],
            'unlock_location_points' => [$point->id],
        ], array_flip($unlockKeys));
        $nextAnswer = $next->choices()->create(['text' => 'Reveal the lead', 'outcomes' => $outcomes]);
        $room = app(GameRoomService::class)->createRoom($case, $player)->value;
        $service = app(EncounterGroupService::class);
        $group = $service->start($room, $level, $player)->value;
        $this->assertFalse($service->vote($room, $first, $answer->id, $player)->isFailure());
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame(0, $room->questionResolutions()->count());

        Artisan::call('queue:work', ['connection' => 'database', '--once' => true, '--sleep' => 0, '--tries' => 1]);
        $this->assertSame(1, DB::table('jobs')->count(), 'A worker must not approve an answer before the deadline.');
        $this->assertSame($first->id, $group->fresh()->current_question_id);

        $this->travel(6)->seconds();
        $this->assertSame(0, Artisan::call('queue:work', ['connection' => 'database', '--once' => true, '--sleep' => 0, '--tries' => 1]));

        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(0, DB::table('failed_jobs')->count());
        $this->assertSame(1, $room->questionResolutions()->count());
        $this->assertSame($next->id, $group->fresh()->current_question_id);
        $this->assertNull($group->fresh()->finalizes_at);

        $this->assertFalse($service->vote($room, $next, $nextAnswer->id, $player)->isFailure());
        $deadline = $group->fresh()->finalizes_at->toISOString();
        $this->travel(6)->seconds();
        Artisan::call('queue:work', ['connection' => 'database', '--once' => true, '--sleep' => 0, '--tries' => 1]);

        $this->assertSame(0, DB::table('failed_jobs')->count());
        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(2, $room->questionResolutions()->count());
        $this->assertSame(in_array('unlock_levels', $unlockKeys), $room->unlockedLevels()->whereKey($unlockedLevel->id)->exists());
        $this->assertSame(in_array('unlock_evidence', $unlockKeys), $room->unlockedEvidences()->whereKey($evidence->id)->exists());
        $this->assertSame(in_array('character_updates', $unlockKeys), $room->unlockedCharacters()->whereKey($character->id)->exists());
        $this->assertSame(in_array('unlock_location_points', $unlockKeys), DB::table('room_unlocked_location_points')->where('room_id', $room->id)->where('choice_id', $point->id)->exists());
        $this->assertTrue($room->completedLevels()->whereKey($level->id)->exists());
        $this->assertSame('completed', $group->fresh()->status);
        $this->assertNull($group->fresh()->finalizes_at);
        (new FinalizeEncounterQuestion($group->id, $next->id, $deadline))->handle($service);
        $this->assertSame(2, $room->questionResolutions()->count());
        Event::assertDispatchedTimes(ItemsUnlocked::class, 1);
        Event::assertDispatched(ItemsUnlocked::class, function (ItemsUnlocked $event) use ($unlockKeys): bool {
            $payload = $event->broadcastWith();
            return count($payload['unlocked_evidences']) === (int) in_array('unlock_evidence', $unlockKeys)
                && count($payload['unlocked_levels']) === (int) in_array('unlock_levels', $unlockKeys);
        });
    }

    public static function unlockOutcomes(): array
    {
        return [
            'levels only' => [['unlock_levels']],
            'evidence only' => [['unlock_evidence']],
            'characters only' => [['character_updates']],
            'location points only' => [['unlock_location_points']],
            'combined unlocks' => [['unlock_levels', 'unlock_evidence', 'character_updates', 'unlock_location_points']],
        ];
    }
}
