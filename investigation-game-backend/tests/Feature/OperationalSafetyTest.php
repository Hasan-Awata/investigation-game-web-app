<?php

namespace Tests\Feature;

use App\Enums\RoomStatus;
use App\Models\GameRoom;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class OperationalSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_pruning_preserves_old_active_rooms_and_recent_terminal_rooms(): void
    {
        $player = \App\Models\User::factory()->create();
        $case = \App\Models\GameCase::create(['title' => 'Retention', 'story' => 'Synthetic', 'XP_on_solve' => 10]);
        foreach ([RoomStatus::Active, RoomStatus::Solved, RoomStatus::Failed] as $status) {
            foreach ([6, 8, 100] as $age) {
                $room = GameRoom::create(['case_id' => $case->id, 'host_user_id' => $player->id, 'status' => $status, 'invite_code' => bin2hex(random_bytes(6))]);
                GameRoom::whereKey($room->id)->update(['updated_at' => now()->subDays($age)]);
            }
        }
        Artisan::call('model:prune', ['--model' => [GameRoom::class]]);
        $this->assertSame(3, GameRoom::where('status', RoomStatus::Active)->count());
        $this->assertSame(1, GameRoom::where('status', RoomStatus::Solved)->count());
        $this->assertSame(1, GameRoom::where('status', RoomStatus::Failed)->count());
    }

    public function test_production_exception_reporting_does_not_log_exception_messages(): void
    {
        $this->app->instance('env', 'production');
        Log::shouldReceive('error')->once()->with('Application operation failed.', \Mockery::on(fn (array $context) => $context['exception_class'] === \RuntimeException::class && !str_contains(json_encode($context), 'seeded-secret')));
        report(new \RuntimeException('seeded-secret player@example.test token=password'));
    }

    public function test_production_errors_are_generic_and_token_maintenance_preserves_current_tokens(): void
    {
        $this->app->instance('env', 'production');
        config(['app.debug' => false]);
        Log::shouldReceive('error')->once();
        \Illuminate\Support\Facades\Route::get('/api/operations-fixture', fn () => throw new \RuntimeException('seeded-secret'));
        $response = $this->getJson('/api/operations-fixture')->assertStatus(500);
        $this->assertStringNotContainsString('seeded-secret', $response->getContent());
        $this->assertArrayNotHasKey('trace', $response->json());
        $player = \App\Models\User::factory()->create();
        $expired = $player->createToken('expired', ['*'], now()->subHours(25))->accessToken;
        $current = $player->createToken('current')->accessToken;
        Artisan::call('sanctum:prune-expired', ['--hours' => 24]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $expired->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->id]);
    }
}
