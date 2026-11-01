<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_users_persist_with_unique_usernames_and_emails(): void
    {
        $users = User::factory()->count(3)->create();

        $this->assertCount(3, $users->pluck('username')->unique());
        $this->assertCount(3, $users->pluck('email')->unique());
        foreach ($users as $user) {
            $this->assertNotEmpty($user->username);
            $this->assertDatabaseHas('users', ['id' => $user->id, 'username' => $user->username]);
        }
    }

    public function test_explicit_attributes_and_unverified_state_are_preserved(): void
    {
        $user = User::factory()->unverified()->create([
            'username' => 'chosen_player',
            'email' => 'chosen@example.test',
            'is_admin' => true,
        ])->fresh();

        $this->assertSame('chosen_player', $user->username);
        $this->assertSame('chosen@example.test', $user->email);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_admin' => true]);
        $this->assertNull($user->email_verified_at);
    }
}
