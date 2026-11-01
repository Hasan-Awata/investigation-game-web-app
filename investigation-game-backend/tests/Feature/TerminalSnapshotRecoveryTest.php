<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\FinalizeEncounterQuestion;
use App\Models\GameCase;
use App\Models\User;
use App\Models\Zone;
use App\Services\AssessmentService;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class TerminalSnapshotRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public static function outcomes(): array
    {
        return [['solved'], ['failed']];
    }

    #[DataProvider('outcomes')]
    public function test_http_snapshots_restore_persisted_statistics_and_actual_awards_without_broadcasting(string $status): void
    {
        config(['queue.default' => 'database', 'broadcasting.default' => 'null']);
        $host = User::factory()->create(['username' => 'recovery-host', 'XP' => 0]);
        $viewer = User::factory()->create(['username' => 'recovery-viewer', 'XP' => 900]);
        $case = GameCase::create(['title' => 'Terminal recovery', 'story' => 'Synthetic', 'XP_on_solve' => 900, 'max_strikes' => 1]);
        DB::table('case_user')->insert([
            'case_id' => $case->id, 'user_id' => $viewer->id, 'status' => 'solved_perfect',
            'completed_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $rooms = app(GameRoomService::class);
        $room = $rooms->createRoom($case, $host)->value;
        $rooms->joinRoom($room->invite_code, $viewer);
        $token = $viewer->createToken('snapshot-recovery')->plainTextToken;
        $this->withToken($token)->getJson("/api/rooms/{$room->id}")->assertOk()->assertJsonPath('room.final_stats', null);

        if ($status === 'failed') {
            $zone = Zone::create(['case_id' => $case->id, 'title' => 'Interview', 'order_index' => 1]);
            $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Synthetic', 'order_index' => 1, 'presentation_type' => 'interrogation']);
            $question = $level->questions()->create(['text' => 'Question', 'order_index' => 1]);
            $choice = $question->choices()->create(['text' => 'Strike', 'outcomes' => ['gives_strike' => true]]);
            $room->unlockedLevels()->attach($level->id);
            $encounters = app(EncounterGroupService::class);
            $group = $encounters->start($room, $level, $viewer)->value;
            $this->assertTrue($encounters->vote($room, $question, $choice->id, $viewer)->isSuccess);
            $deadline = $group->fresh()->finalizes_at->toISOString();
            $this->travel(6)->seconds();
            $this->assertSame(0, Artisan::call('queue:work', ['connection' => 'database', '--once' => true, '--sleep' => 0, '--tries' => 1]));
            (new FinalizeEncounterQuestion($group->id, $question->id, $deadline))->handle($encounters);
            $this->assertSame(1, $room->questionResolutions()->count());
            $this->assertSame(0, $group->members()->whereNull('left_at')->count());
        } else {
            $this->assertTrue(app(AssessmentService::class)->evaluateFinalVerdict($room, [])->isSuccess);
        }

        $persisted = $room->fresh()->final_stats;
        $this->assertSame(0, $persisted['xp_awards'][$viewer->id]);
        $this->assertSame($status === 'solved' ? 900 : 0, $persisted['xp_awards'][$host->id]);
        $this->assertArrayHasKey('time_taken', $persisted);
        $updatedAt = $room->fresh()->updated_at->toISOString();
        foreach ([$host, $viewer] as $reader) {
            $this->app['auth']->forgetGuards();
            $this->withToken($reader->createToken('revisit')->plainTextToken);
            $this->postJson('/api/rooms/join', ['invite_code' => $room->invite_code])
                ->assertOk()->assertJsonPath('room.id', $room->id)->assertJsonPath('room.final_stats', $persisted);
            for ($read = 0; $read < 2; $read++) {
                $this->getJson("/api/rooms/{$room->id}")->assertOk()
                    ->assertJsonPath('room.status', $status)->assertJsonPath('room.final_stats', $persisted);
            }
        }
        $this->assertSame($updatedAt, $room->fresh()->updated_at->toISOString());
        $this->assertSame(2, $room->users()->count());
        $this->assertSame(900, $viewer->fresh()->XP);
        $this->assertDatabaseHas('case_user', ['user_id' => $viewer->id, 'case_id' => $case->id, 'status' => 'solved_perfect']);
        $this->app['auth']->forgetGuards();
        $this->withToken(User::factory()->create(['username' => 'recovery-outsider'])->createToken('outsider')->plainTextToken)
            ->getJson("/api/rooms/{$room->id}")->assertForbidden()->assertJsonMissingPath('room.final_stats');
        $this->postJson('/api/rooms/join', ['invite_code' => $room->invite_code])
            ->assertNotFound()->assertJsonMissingPath('room');
        $this->assertSame(2, $room->users()->count());
    }
}
