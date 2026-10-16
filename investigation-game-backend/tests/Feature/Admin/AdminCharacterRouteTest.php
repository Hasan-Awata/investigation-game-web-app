<?php

namespace Tests\Feature\Admin;

use App\Models\GameCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Admin\Concerns\ActsAsAdmin;
use Tests\TestCase;

class AdminCharacterRouteTest extends TestCase
{
    use ActsAsAdmin;
    use RefreshDatabase;

    private function makeCase(): GameCase
    {
        return GameCase::create([
            'title' => 'Character Case',
            'story' => 'Story',
            'XP_on_solve' => 100,
        ]);
    }

    public function test_character_crud_resolves_after_the_controller_move(): void
    {
        $this->actingAsAdmin();
        $case = $this->makeCase();

        $create = $this->postJson('/api/admin/characters', [
            'case_id' => $case->id,
            'name' => 'Night Clerk',
            'background' => 'Works the graveyard shift.',
            'is_initial' => true,
            'is_guilty' => false,
            'default_status' => 'available',
            'store_locally' => false,
        ])->assertStatus(201);

        $characterId = $create->json('character.id');
        $this->assertNotNull($characterId);

        $this->putJson("/api/admin/characters/{$characterId}", [
            'case_id' => $case->id,
            'name' => 'Night Clerk (Updated)',
            'background' => 'Works the graveyard shift.',
            'is_initial' => true,
            'is_guilty' => true,
            'charge' => 'fraud',
            'default_status' => 'incarcerated',
            'store_locally' => false,
        ])->assertOk()
            ->assertJsonPath('character.name', 'Night Clerk (Updated)')
            ->assertJsonPath('character.is_guilty', true);

        $this->deleteJson("/api/admin/characters/{$characterId}")->assertOk();
        $this->assertDatabaseMissing('characters', ['id' => $characterId]);
    }

    public function test_missing_character_returns_404_via_route_model_binding(): void
    {
        $this->actingAsAdmin();
        $case = $this->makeCase();

        $this->putJson('/api/admin/characters/999999', [
            'case_id' => $case->id,
            'name' => 'Ghost',
            'is_initial' => false,
            'is_guilty' => false,
            'default_status' => 'available',
            'store_locally' => false,
        ])->assertNotFound();
    }

    public function test_invalid_character_payload_returns_422(): void
    {
        $this->actingAsAdmin();
        $case = $this->makeCase();

        $this->postJson('/api/admin/characters', [
            'case_id' => $case->id,
            'name' => '',
            'is_initial' => true,
            'is_guilty' => false,
            'default_status' => 'not-a-status',
            'store_locally' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'default_status']);
    }
}
