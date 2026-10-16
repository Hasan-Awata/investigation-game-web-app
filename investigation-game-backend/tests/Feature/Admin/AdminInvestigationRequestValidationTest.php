<?php

namespace Tests\Feature\Admin;

use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\Level;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Admin\Concerns\ActsAsAdmin;
use Tests\TestCase;

class AdminInvestigationRequestValidationTest extends TestCase
{
    use ActsAsAdmin;
    use RefreshDatabase;

    private GameCase $case;

    private Evidence $evidenceA;

    private Evidence $evidenceB;

    private Level $rewardLevel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsAdmin();

        $this->case = GameCase::create([
            'title' => 'Request Case',
            'story' => 'Story',
            'XP_on_solve' => 100,
        ]);

        $zone = Zone::create(['case_id' => $this->case->id, 'title' => 'Zone', 'order_index' => 1]);
        $this->rewardLevel = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Reward Level',
            'details' => 'Details',
            'order_index' => 1,
        ]);

        $this->evidenceA = Evidence::create([
            'case_id' => $this->case->id,
            'title' => 'Evidence A',
            'evidence_type' => 'document',
            'is_initial' => true,
        ]);
        $this->evidenceB = Evidence::create([
            'case_id' => $this->case->id,
            'title' => 'Evidence B',
            'evidence_type' => 'document',
            'is_initial' => true,
        ]);
    }

    public function test_fewer_than_two_required_items_is_rejected(): void
    {
        $this->postJson('/api/admin/investigation-requests', [
            'case_id' => $this->case->id,
            'request_type' => 'search_warrant',
            'unlocks_evidence_id' => $this->evidenceA->id,
            'required_evidence_ids' => [$this->evidenceB->id],
            'required_character_ids' => [],
        ])->assertStatus(422)
            ->assertJsonValidationErrors('required_evidence_ids');
    }

    public function test_request_that_unlocks_nothing_is_rejected(): void
    {
        $this->postJson('/api/admin/investigation-requests', [
            'case_id' => $this->case->id,
            'request_type' => 'search_warrant',
            'required_evidence_ids' => [$this->evidenceA->id, $this->evidenceB->id],
            'required_character_ids' => [],
        ])->assertStatus(422)
            ->assertJsonValidationErrors('unlocks_evidence_id');
    }

    public function test_valid_request_is_created(): void
    {
        $this->postJson('/api/admin/investigation-requests', [
            'case_id' => $this->case->id,
            'request_type' => 'search_warrant',
            'unlocks_level_id' => $this->rewardLevel->id,
            'required_evidence_ids' => [$this->evidenceA->id, $this->evidenceB->id],
            'required_character_ids' => [],
        ])->assertStatus(201)
            ->assertJsonPath('investigation_request.unlocks_level_id', $this->rewardLevel->id)
            ->assertJsonCount(2, 'investigation_request.required_evidences');
    }
}
