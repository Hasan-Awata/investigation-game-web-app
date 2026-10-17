<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use App\Models\Level;
use App\Models\RoomFiledRequest;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvestigationRequestSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private GameCase $case;
    private GameRoom $room;
    private Evidence $initialEvidenceA;
    private Evidence $initialEvidenceB;
    private Evidence $hiddenEvidence;
    private Evidence $rewardEvidence;
    private Character $initialCharacter;
    private Character $lockedCharacter;
    private Level $rewardLevel;
    private InvestigationRequest $mixedRequest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Agent',
            'username' => 'agent_' . uniqid(),
            'email' => uniqid() . '@test.local',
            'password' => 'secret-password',
        ]);

        $this->case = GameCase::create([
            'title' => 'Fixture Case',
            'story' => 'Story',
            'XP_on_solve' => 100,
        ]);

        $zone = Zone::create(['case_id' => $this->case->id, 'title' => 'Zone', 'order_index' => 1]);
        $this->rewardLevel = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Next Lead',
            'details' => 'Details',
            'order_index' => 2,
            'is_initial' => false,
        ]);

        $this->initialEvidenceA = $this->makeEvidence('Evidence A', true);
        $this->initialEvidenceB = $this->makeEvidence('Evidence B', true);
        $this->hiddenEvidence = $this->makeEvidence('Hidden Evidence', false);
        $this->rewardEvidence = $this->makeEvidence('Reward Evidence', false);

        $this->initialCharacter = Character::create([
            'case_id' => $this->case->id,
            'name' => 'Initial Witness',
            'is_initial' => true,
        ]);
        $this->lockedCharacter = Character::create([
            'case_id' => $this->case->id,
            'name' => 'Locked Suspect',
            'is_initial' => false,
        ]);

        // Requires evidence + character, unlocks an evidence.
        $this->mixedRequest = InvestigationRequest::create([
            'case_id' => $this->case->id,
            'request_type' => 'search_warrant',
            'unlocks_evidence_id' => $this->rewardEvidence->id,
        ]);
        $this->mixedRequest->requiredEvidences()->sync([$this->initialEvidenceA->id]);
        $this->mixedRequest->requiredCharacters()->sync([$this->initialCharacter->id]);

        $this->room = GameRoom::create([
            'case_id' => $this->case->id,
            'host_user_id' => $this->user->id,
            'invite_code' => strtoupper(substr(md5(uniqid()), 0, 6)),
            'status' => 'active',
        ]);

        // Possession is runtime pivot state, seeded on room creation. Mirror
        // that contract here so the room "possesses" its initial items.
        $this->room->unlockedEvidences()->sync([
            $this->initialEvidenceA->id,
            $this->initialEvidenceB->id,
        ]);
        $this->room->characters()->sync([
            $this->initialCharacter->id => [
                'status' => 'available',
                'is_unlocked' => true,
            ],
        ]);

        Sanctum::actingAs($this->user);
    }

    private function makeEvidence(string $title, bool $isInitial): Evidence
    {
        return Evidence::create([
            'case_id' => $this->case->id,
            'title' => $title,
            'evidence_type' => 'document',
            'is_initial' => $isInitial,
        ]);
    }

    private function submit(array $payload)
    {
        return $this->postJson("/api/rooms/{$this->room->id}/investigate", $payload);
    }

    public function test_correct_evidence_and_character_combination_unlocks_and_logs_history(): void
    {
        $response = $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [$this->initialCharacter->id],
        ]);

        $response->assertOk()->assertJsonPath('status', 'success');
        $this->assertNotEmpty($response->json('message'));

        $unlockedEvidenceIds = array_column($response->json('unlocked_evidence'), 'id');
        $this->assertContains($this->rewardEvidence->id, $unlockedEvidenceIds);

        $this->assertDatabaseHas('room_evidences', [
            'room_id' => $this->room->id,
            'evidence_id' => $this->rewardEvidence->id,
        ]);
        $this->assertTrue(
            $this->room->completedRequests()->where('request_id', $this->mixedRequest->id)->exists()
        );

        $history = RoomFiledRequest::where('room_id', $this->room->id)->firstOrFail();
        $this->assertSame('search_warrant', $history->request_type);
        $this->assertSame([$this->initialEvidenceA->id], $history->evidence_ids);
        $this->assertSame([$this->initialCharacter->id], $history->character_ids);
    }

    public function test_incorrect_combination_is_rejected(): void
    {
        $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id, $this->initialEvidenceB->id],
            'character_ids' => [],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'The DA rejected your request. The provided items do not establish sufficient grounds.']);

        $this->assertDatabaseCount('room_filed_requests', 0);
        $this->assertDatabaseMissing('room_evidences', [
            'room_id' => $this->room->id,
            'evidence_id' => $this->rewardEvidence->id,
        ]);
        $this->assertFalse($this->room->completedRequests()->exists());
    }

    public function test_superset_of_valid_combination_explains_that_extra_items_must_be_removed(): void
    {
        $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id, $this->initialEvidenceB->id],
            'character_ids' => [$this->initialCharacter->id],
        ])->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Your request contains unnecessary items that muddy the warrant. Narrow your selection to only the directly connected evidence and characters.',
            ]);

        $this->assertDatabaseCount('room_filed_requests', 0);
        $this->assertFalse($this->room->completedRequests()->exists());
    }

    public function test_submission_with_fewer_than_two_items_is_rejected(): void
    {
        $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'A procedural request requires at least two items.']);
    }

    public function test_completed_request_cannot_be_resubmitted(): void
    {
        $payload = [
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [$this->initialCharacter->id],
        ];

        $this->submit($payload)->assertOk();

        $this->submit($payload)->assertStatus(422)
            ->assertJsonFragment(['message' => 'This Search Warrant has already been executed.']);

        $this->assertDatabaseCount('room_filed_requests', 1);
    }

    public function test_undiscovered_evidence_is_rejected(): void
    {
        $this->submit([
            'evidence_ids' => [$this->hiddenEvidence->id],
            'character_ids' => [$this->initialCharacter->id],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'Unauthorized: You cannot file a request using evidence you have not yet discovered.']);
    }

    public function test_undiscovered_character_is_rejected(): void
    {
        $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [$this->lockedCharacter->id],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'Unauthorized: You cannot file a request using a character you have not yet discovered.']);
    }

    public function test_character_unlocked_for_room_counts_as_possessed(): void
    {
        $this->room->characters()->attach($this->lockedCharacter->id, [
            'status' => 'available',
            'is_unlocked' => true,
        ]);

        $unlockedRequest = InvestigationRequest::create([
            'case_id' => $this->case->id,
            'request_type' => 'phone_records',
            'unlocks_level_id' => $this->rewardLevel->id,
        ]);
        $unlockedRequest->requiredEvidences()->sync([$this->initialEvidenceA->id]);
        $unlockedRequest->requiredCharacters()->sync([$this->lockedCharacter->id]);

        $response = $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [$this->lockedCharacter->id],
        ]);

        $response->assertOk()->assertJsonPath('status', 'success');
        $unlockedLevelIds = array_column($response->json('unlocked_levels'), 'id');
        $this->assertContains($this->rewardLevel->id, $unlockedLevelIds);
        $this->assertDatabaseHas('room_unlocked_levels', [
            'room_id' => $this->room->id,
            'level_id' => $this->rewardLevel->id,
        ]);
    }

    public function test_evidence_matching_is_order_insensitive(): void
    {
        $evidenceOnlyRequest = InvestigationRequest::create([
            'case_id' => $this->case->id,
            'request_type' => 'financial_records',
            'unlocks_level_id' => $this->rewardLevel->id,
        ]);
        $evidenceOnlyRequest->requiredEvidences()->sync([
            $this->initialEvidenceA->id,
            $this->initialEvidenceB->id,
        ]);

        $this->submit([
            'evidence_ids' => [$this->initialEvidenceB->id, $this->initialEvidenceA->id],
            'character_ids' => [],
        ])->assertOk()->assertJsonPath('status', 'success');
    }

    public function test_matching_combination_without_unlock_leads_to_nothing(): void
    {
        $deadEndRequest = InvestigationRequest::create([
            'case_id' => $this->case->id,
            'request_type' => 'dna_test',
        ]);
        $deadEndRequest->requiredEvidences()->sync([$this->initialEvidenceB->id]);
        $deadEndRequest->requiredCharacters()->sync([$this->initialCharacter->id]);

        $this->submit([
            'evidence_ids' => [$this->initialEvidenceB->id],
            'character_ids' => [$this->initialCharacter->id],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'The DA rejected your request. This combination does not lead to any new lead.']);

        $this->assertDatabaseCount('room_filed_requests', 0);
    }

    public function test_unknown_character_id_fails_validation(): void
    {
        $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [999999],
        ])->assertStatus(422)->assertJsonValidationErrors('character_ids.0');
    }
}
