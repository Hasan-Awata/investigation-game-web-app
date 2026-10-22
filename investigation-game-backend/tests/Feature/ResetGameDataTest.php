<?php

namespace Tests\Feature;

use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Services\MediaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class ResetGameDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_requires_the_exact_database_name_and_preserves_data_when_confirmation_is_wrong(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $case = GameCase::create(['title' => 'Keep Until Confirmed', 'story' => 'Story', 'XP_on_solve' => 10]);

        $this->artisan('app:reset-game-data', ['--confirm' => 'wrong-database-name'])
            ->assertFailed();

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertDatabaseHas('cases', ['id' => $case->id]);
    }

    public function test_confirmed_reset_removes_game_data_and_non_admin_users_idempotently(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'remember_token' => 'remember-me']);
        $player = User::factory()->create(['is_admin' => false]);
        $case = GameCase::create([
            'title' => 'Reset Case',
            'story' => 'Story',
            'XP_on_solve' => 10,
            'img_url' => 'https://media.example/reset-case.png',
        ]);
        $room = GameRoom::create([
            'case_id' => $case->id,
            'host_user_id' => $player->id,
            'invite_code' => 'RESET1',
            'status' => 'active',
        ]);

        $media = Mockery::mock(MediaService::class);
        $media->shouldReceive('delete')->once()->with('https://media.example/reset-case.png');
        app()->instance(MediaService::class, $media);

        $databaseName = DB::connection()->getDatabaseName();
        $this->artisan('app:reset-game-data', ['--confirm' => $databaseName])->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $admin->id, 'remember_token' => null]);
        $this->assertDatabaseMissing('users', ['id' => $player->id]);
        $this->assertDatabaseMissing('cases', ['id' => $case->id]);
        $this->assertDatabaseMissing('game_rooms', ['id' => $room->id]);

        $this->artisan('app:reset-game-data', ['--confirm' => $databaseName])->assertSuccessful();
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertSame(1, User::query()->count());
    }
}
