<?php

namespace Tests\Feature;

use App\Models\GameCase;
use App\Models\User;
use App\Services\GameRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrivateChannelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_room_channel_requires_an_authenticated_participant(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'qualification-key',
            'broadcasting.connections.reverb.secret' => 'qualification-secret',
            'broadcasting.connections.reverb.app_id' => 'qualification-app',
        ]);
        // The test application boots with the null broadcaster; register callbacks on Reverb too.
        require base_path('routes/channels.php');
        $participant = User::factory()->create();
        $outsider = User::factory()->create();
        $case = GameCase::create(['title' => 'Channel qualification', 'story' => 'Synthetic', 'XP_on_solve' => 10]);
        $room = app(GameRoomService::class)->createRoom($case, $participant)->value;
        $request = ['socket_id' => '123.456', 'channel_name' => 'private-room.'.$room->id];

        $this->postJson('/api/broadcasting/auth', $request)->assertUnauthorized();
        $this->withToken($outsider->createToken('qualification')->plainTextToken)
            ->postJson('/api/broadcasting/auth', $request)->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($participant->createToken('qualification')->plainTextToken)
            ->postJson('/api/broadcasting/auth', $request)->assertOk()->assertJsonStructure(['auth']);
        $this->postJson('/api/broadcasting/auth', [...$request, 'channel_name' => 'private-room.999999'])->assertForbidden();
    }
}
