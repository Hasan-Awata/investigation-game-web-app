<?php

namespace Tests\Feature;

use App\Models\GameCase;
use App\Models\User;
use App\Models\Zone;
use App\Services\GameRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForbiddenSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_reauthentication_recovers_existing_investigation(): void
    {
        $user = User::factory()->create(['username' => 'returning-player', 'password' => \Illuminate\Support\Facades\Hash::make('password123')]);
        $case = GameCase::create(['title' => 'Recovery', 'story' => 'Story', 'is_published' => true, 'XP_on_solve' => 10]);
        $room = app(GameRoomService::class)->createRoom($case, $user)->value;
        $room->update(['strikes' => 1]);
        $this->withToken('expired-token')->getJson('/api/user')->assertUnauthorized();
        $response = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])->assertOk();
        $this->withToken($response->json('token'))->getJson('/api/cases')->assertOk()->assertJsonPath('cases.0.active_room_invite_code', $room->invite_code);
        $this->postJson('/api/rooms/join', ['invite_code' => $room->invite_code])->assertOk()->assertJsonPath('room.strikes', 1);
        $this->getJson("/api/rooms/{$room->id}")->assertOk()->assertJsonPath('room.status', 'active')->assertJsonPath('room.strikes', 1);
    }

    public function test_forbidden_actions_preserve_authentication_and_permitted_play(): void
    {
        $user = User::factory()->create(['username' => 'forbidden-player']);
        $other = User::factory()->create(['username' => 'other-player']);
        $case = GameCase::create(['title' => 'Forbidden', 'story' => 'Story', 'is_published' => true, 'XP_on_solve' => 10]);
        $room = app(GameRoomService::class)->createRoom($case, $user)->value;
        $foreign = app(GameRoomService::class)->createRoom($case, $other)->value;
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $level = $zone->levels()->create(['title' => 'Location', 'details' => 'Details', 'order_index' => 1, 'presentation_type' => 'location']);
        $question = $level->questions()->create(['text' => 'Point', 'order_index' => 1]);
        $choice = $question->choices()->create(['text' => 'Inspect']);
        $token = $user->createToken('test')->plainTextToken;
        $this->withToken($token)->postJson("/api/rooms/{$room->id}/inspect", ['choice_id' => $choice->id])->assertForbidden();
        $room->unlockedLevels()->attach($level->id);
        $this->postJson("/api/rooms/{$room->id}/inspect", ['choice_id' => $choice->id])->assertOk();
        $this->getJson("/api/rooms/{$foreign->id}")->assertForbidden()->assertJsonMissingPath('room');
        $this->getJson('/api/admin/cases')->assertForbidden();
        $this->getJson('/api/admin/cases/'.$case->id.'/export')->assertForbidden();
        $this->getJson('/api/user')->assertOk()->assertJsonPath('id', $user->id);
        $this->assertSame(1, $user->tokens()->count());
    }
}
