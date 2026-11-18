<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use LogicException;
use Tests\TestCase;

class ManagementTrustMigrationTest extends TestCase
{
    private const CONNECTION = 'trust_migration';

    private const ATTEMPTS_MIGRATION = '2026_11_18_000000_create_room_submission_attempts_table';

    private string $originalConnection;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection = DB::getDefaultConnection();
        config(['database.connections.'.self::CONNECTION => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
        DB::setDefaultConnection(self::CONNECTION);
        $this->assertSame(0, Artisan::call('migrate'));
    }

    protected function tearDown(): void
    {
        DB::setDefaultConnection($this->originalConnection);
        DB::purge(self::CONNECTION);

        parent::tearDown();
    }

    public function test_fresh_schema_defaults_to_full_trust(): void
    {
        $host = User::factory()->create();
        $case = DB::table('cases')->insertGetId(['title' => 'Case', 'story' => 'Story', 'XP_on_solve' => 0]);
        $room = DB::table('game_rooms')->insertGetId(['case_id' => $case, 'host_user_id' => $host->id, 'invite_code' => 'ACTIVE']);

        $this->assertDatabaseHas('game_rooms', ['id' => $room, 'management_trust' => 100]);
        $this->assertTrue(Schema::hasTable('room_submission_attempts'));
    }

    public function test_upgraded_schema_preserves_trust_progress_and_attempts(): void
    {
        $this->markPriorBaseline();
        DB::table('migrations')->insert(['migration' => '2026_11_18_000000_prior_trust_upgrade', 'batch' => 2]);

        $host = User::factory()->create();
        $case = DB::table('cases')->insertGetId(['title' => 'Case', 'story' => 'Story', 'XP_on_solve' => 0]);
        $active = ['case_id' => $case, 'host_user_id' => $host->id, 'invite_code' => 'ACTIVE', 'status' => 'active', 'management_trust' => 66];
        $room = DB::table('game_rooms')->insertGetId($active);
        $membership = ['room_id' => $room, 'user_id' => $host->id, 'role' => 'host'];
        DB::table('room_users')->insert($membership + ['joined_at' => now()]);

        $terminal = array_replace($active, ['invite_code' => 'FAILED', 'status' => 'failed', 'management_trust' => 0]);
        $failedRoom = DB::table('game_rooms')->insertGetId($terminal + ['final_stats' => '{"xp_gained":0}']);
        DB::table('case_user')->insert(['case_id' => $case, 'user_id' => $host->id, 'status' => 'failed_trust']);

        $attempt = [
            'room_id' => $room,
            'user_id' => $host->id,
            'action' => 'evidence_tray',
            'attempt_id' => '2eee4806-60de-4887-8d06-b49c1c4b9f7e',
            'payload_hash' => str_repeat('a', 64),
            'result' => '{"management_trust":66}',
        ];
        DB::table('room_submission_attempts')->insert($attempt);

        $this->assertSame(0, Artisan::call('migrate'));
        $this->assertDatabaseHas('migrations', ['migration' => self::ATTEMPTS_MIGRATION]);
        $this->assertDatabaseHas('game_rooms', $active);
        $this->assertDatabaseHas('game_rooms', $terminal);
        $this->assertDatabaseHas('room_users', $membership);
        $this->assertDatabaseHas('room_submission_attempts', $attempt);
        $this->assertSame('{"xp_gained":0}', DB::table('game_rooms')->where('id', $failedRoom)->value('final_stats'));
        $this->assertDatabaseHas('case_user', ['case_id' => $case, 'user_id' => $host->id, 'status' => 'failed_trust']);
    }

    public function test_incomplete_prior_upgrade_requires_the_previous_release(): void
    {
        $this->markPriorBaseline();

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Complete the Management Trust migration on the previous release');
        Artisan::call('migrate');
    }

    private function markPriorBaseline(): void
    {
        DB::table('migrations')->where('migration', self::ATTEMPTS_MIGRATION)->delete();
        DB::table('migrations')->insert(['migration' => '2026_08_02_065959_prior_baseline', 'batch' => 1]);
    }
}
