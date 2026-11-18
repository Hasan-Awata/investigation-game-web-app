<?php

namespace Tests\Feature;

use App\Models\GameCase;
use App\Models\User;
use App\Services\GameRoomService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ManagementTrustMigrationTest extends TestCase
{
    public function test_activation_preserves_progress_and_converts_legacy_authored_penalties(): void
    {
        $originalConnection = DB::getDefaultConnection();
        config(['database.connections.trust_migration' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
        DB::setDefaultConnection('trust_migration');

        try {
            $migration = database_path('migrations/2026_11_18_000000_replace_strikes_with_management_trust.php');
            $priorMigrations = array_filter(glob(database_path('migrations/*.php')), fn (string $file) => basename($file) < basename($migration));
            $this->assertSame(0, Artisan::call('migrate', ['--path' => array_values($priorMigrations), '--realpath' => true]));

            $host = User::factory()->create(['username' => 'migration-host']);
            $caseId = DB::table('cases')->insertGetId(['title' => 'Legacy case', 'story' => 'Story', 'XP_on_solve' => 0, 'max_strikes' => 3]);
            $activeId = DB::table('game_rooms')->insertGetId(['case_id' => $caseId, 'host_user_id' => $host->id, 'invite_code' => 'ACTIVE', 'status' => 'active', 'strikes' => 2]);
            $failedId = DB::table('game_rooms')->insertGetId(['case_id' => $caseId, 'host_user_id' => $host->id, 'invite_code' => 'FAILED', 'status' => 'failed', 'strikes' => 3]);
            $zoneId = DB::table('zones')->insertGetId(['case_id' => $caseId, 'title' => 'Zone', 'order_index' => 1]);
            $levelId = DB::table('levels')->insertGetId(['zone_id' => $zoneId, 'title' => 'Interview', 'details' => 'Details', 'order_index' => 1, 'presentation_type' => 'interrogation']);
            $questionId = DB::table('questions')->insertGetId(['level_id' => $levelId, 'text' => 'Question', 'order_index' => 1]);
            $choiceId = DB::table('choices')->insertGetId(['question_id' => $questionId, 'text' => 'Choice', 'outcomes' => '{"gives_strike":true,"feedback":"Keep this"}']);
            DB::table('room_users')->insert(['room_id' => $activeId, 'user_id' => $host->id, 'role' => 'host', 'joined_at' => now()]);
            DB::table('case_user')->insert(['case_id' => $caseId, 'user_id' => $host->id, 'status' => 'failed_strikes']);

            $this->assertSame(0, Artisan::call('migrate', ['--path' => [$migration], '--realpath' => true]));
            $this->assertDatabaseHas('game_rooms', ['id' => $activeId, 'status' => 'active', 'management_trust' => 100]);
            $this->assertDatabaseHas('room_users', ['room_id' => $activeId, 'user_id' => $host->id]);
            $this->assertDatabaseHas('game_rooms', ['id' => $failedId, 'status' => 'failed', 'management_trust' => null]);
            $this->assertDatabaseHas('case_user', ['case_id' => $caseId, 'user_id' => $host->id, 'status' => 'failed_trust']);
            $this->assertSame(['feedback' => 'Keep this', 'trust_loss' => 34], json_decode(DB::table('choices')->where('id', $choiceId)->value('outcomes'), true));
            $this->assertFalse(Schema::hasColumn('cases', 'max_strikes'));
            $this->assertFalse(Schema::hasColumn('game_rooms', 'strikes'));
            $this->assertSame(100, app(GameRoomService::class)->createRoom(GameCase::findOrFail($caseId), $host)->value->management_trust);
        } finally {
            DB::setDefaultConnection($originalConnection);
            DB::purge('trust_migration');
        }
    }
}
