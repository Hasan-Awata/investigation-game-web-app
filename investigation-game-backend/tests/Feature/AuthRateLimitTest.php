<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AuthRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->freezeTime();
    }

    private function credentials(): array
    {
        return ['email' => 'player@example.test', 'password' => 'password123'];
    }

    public function test_login_boundary_preserves_tokens_and_recovers(): void
    {
        $user = User::factory()->create(['username' => 'player', ...$this->credentials()]);
        $token = $user->createToken('existing')->plainTextToken;
        $before = $user->fresh()->getAttributes();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => ' PLAYER@example.test ', 'password' => 'wrong'])->assertUnauthorized();
        }
        $response = $this->postJson('/api/login', $this->credentials())->assertStatus(429)
            ->assertJsonPath('error', 'Too Many Requests')->assertJsonPath('retry_after', 60)->assertHeader('Retry-After', '60');
        $this->assertStringNotContainsString($user->email, $response->getContent());
        $this->assertSame($before, $user->fresh()->getAttributes());
        $this->assertSame(1, $user->tokens()->count());
        $this->postJson('/api/login', ['email' => 'other@example.test', 'password' => 'wrong'])->assertUnauthorized();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.3'])->postJson('/api/login', $this->credentials())->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => explode('|', $token)[0]]);
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1']);
        $this->travel(61)->seconds();
        $newToken = $this->postJson('/api/login', $this->credentials())->assertOk()->json('token');
        $this->assertSame(1, $user->tokens()->count());
        $this->withToken($newToken)->getJson('/api/admin/cases')->assertForbidden();
        $this->withToken($newToken)->postJson('/api/logout')->assertOk();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_email_rotation_and_forwarding_cannot_bypass_ip_limit(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->withHeader('X-Forwarded-For', '198.51.100.'.$i)
                ->postJson('/api/login', ['email' => "p{$i}@example.test", 'password' => 'wrong'])->assertUnauthorized();
        }
        $this->postJson('/api/login', $this->credentials())->assertStatus(429);
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.2'])->postJson('/api/login', $this->credentials())->assertUnauthorized();
    }

    public function test_registration_limits_and_expiry_without_side_effects(): void
    {
        for ($i = 0; $i < 20; $i++) {
            if ($i > 0 && $i % 5 === 0) $this->travel(61)->seconds();
            $this->postJson('/api/register', ['username' => "player{$i}", 'name' => 'Player', 'email' => "p{$i}@example.test", 'password' => 'password123'])->assertCreated();
            if ($i === 4) {
                $this->postJson('/api/register', [])->assertStatus(429);
                $this->assertDatabaseCount('users', 5);
            }
        }
        $this->travel(61)->seconds();
        $this->postJson('/api/register', [])->assertStatus(429);
        $this->assertDatabaseCount('users', 20);
        $this->assertDatabaseCount('personal_access_tokens', 20);
        $this->postJson('/api/login', $this->credentials())->assertUnauthorized();
        $this->travel(3601)->seconds();
        $this->postJson('/api/register', ['username' => 'new', 'name' => 'New', ...$this->credentials()])->assertCreated();
    }

    public function test_validation_and_protected_routes_remain_intact(): void
    {
        $this->postJson('/api/login', ['email' => ['invalid']])->assertUnprocessable();
        $this->postJson('/api/register', [])->assertUnprocessable();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_database_cache_persists_across_limiter_instances_with_private_keys(): void
    {
        $limits = app(RateLimiter::class)->limiter('auth-login')(\Illuminate\Http\Request::create('/api/login', 'POST', $this->credentials()));
        foreach ($limits as $limit) {
            foreach (['player@example.test', '127.0.0.1', 'password123'] as $secret) {
                $this->assertStringNotContainsString($secret, $limit->key);
            }
        }
        $key = 'auth-test:'.$limits[0]->key;
        (new RateLimiter(Cache::store('database')))->hit($key, 60);
        $this->assertTrue((new RateLimiter(Cache::store('database')))->tooManyAttempts($key, 1));
        $this->travel(61)->seconds();
        $this->assertFalse((new RateLimiter(Cache::store('database')))->tooManyAttempts($key, 1));
    }
}
