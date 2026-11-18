<?php

namespace Tests\Feature;

use App\Events\ItemsUnlocked;
use App\Events\RequestFiled;
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
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
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
            'username' => 'agent_'.uniqid(),
            'email' => uniqid().'@test.local',
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
        return $this->postJson("/api/rooms/{$this->room->id}/investigate", ['request_id' => $this->mixedRequest->id, ...$payload]);
    }

    public function test_correct_evidence_and_character_combination_unlocks_and_logs_history(): void
    {
        $response = $this->submit([
            'evidence_ids' => [$this->initialEvidenceA->id],
            'character_ids' => [$this->initialCharacter->id],
        ]);

        $response->assertOk()->assertJsonPath('status', 'success')
            ->assertJsonPath('unlocked_evidence.0.id', $this->rewardEvidence->id)
            ->assertJsonPath('unlocked_evidence.0.title', $this->rewardEvidence->title)
            ->assertJsonPath('unlocked_levels', []);
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
        ])->assertOk()->assertJsonPath('status', 'rejected')->assertJsonPath('management_trust', 95)
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
        ])->assertOk()->assertJsonPath('status', 'rejected')->assertJsonPath('management_trust', 95)
            ->assertJsonFragment([
                'message' => 'Your request contains unnecessary items. Narrow your selection to directly connected evidence and characters.',
            ]);

        $this->assertDatabaseCount('room_filed_requests', 0);
        $this->assertFalse($this->room->completedRequests()->exists());
    }

    public function test_replaying_a_rejected_attempt_does_not_deduct_trust_twice(): void
    {
        $payload = [
            'attempt_id' => (string) Str::uuid(),
            'evidence_ids' => [$this->initialEvidenceA->id, $this->initialEvidenceB->id],
            'character_ids' => [],
        ];

        $this->submit($payload)->assertOk()->assertJsonPath('trust_loss', 5)->assertJsonPath('management_trust', 95);
        $this->submit($payload)->assertOk()->assertJsonPath('management_trust', 95);
        $this->assertSame(95, $this->room->fresh()->management_trust);

        $payload['attempt_id'] = (string) Str::uuid();
        $this->submit($payload)->assertOk()->assertJsonPath('management_trust', 90);

        $this->room->update(['management_trust' => 3]);
        $payload['attempt_id'] = (string) Str::uuid();
        $this->submit($payload)->assertOk()
            ->assertJsonPath('status', 'failed_final')
            ->assertJsonPath('trust_loss', 3)
            ->assertJsonPath('management_trust', 0)
            ->assertJsonPath('stats.failure_reason', 'failed_trust');
        $this->submit($payload)->assertOk()->assertJsonPath('status', 'failed_final');
        $this->assertSame('failed', $this->room->fresh()->status->value);
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
            'request_id' => $unlockedRequest->id,
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
            'request_id' => $evidenceOnlyRequest->id,
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
            'request_id' => $deadEndRequest->id,
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

    private function matchingPayload(): array
    {
        return ['evidence_ids' => [$this->initialEvidenceA->id], 'character_ids' => [$this->initialCharacter->id]];
    }

    private function secondRequest(string $type = 'search_warrant'): InvestigationRequest
    {
        $request = InvestigationRequest::create([
            'case_id' => $this->case->id, 'request_type' => $type, 'unlocks_level_id' => $this->rewardLevel->id,
        ]);
        $request->requiredEvidences()->sync([$this->initialEvidenceA->id]);
        $request->requiredCharacters()->sync([$this->initialCharacter->id]);

        return $request;
    }

    public function test_request_id_is_required_and_type_only_submission_cannot_bypass_it(): void
    {
        foreach ([null, '', 'invalid'] as $id) {
            $this->submit(['request_id' => $id, ...$this->matchingPayload()])
                ->assertUnprocessable()->assertJsonValidationErrors('request_id');
        }
        $this->postJson("/api/rooms/{$this->room->id}/investigate", ['request_type' => 'search_warrant', ...$this->matchingPayload()])
            ->assertUnprocessable()->assertJsonValidationErrors('request_id');
        $this->assertDatabaseCount('room_filed_requests', 0);
    }

    public function test_only_the_selected_request_is_validated_and_type_is_derived_from_it(): void
    {
        $other = $this->secondRequest('phone_records');
        $other->requiredEvidences()->sync([$this->initialEvidenceB->id]);
        $this->submit(['request_id' => $other->id, ...$this->matchingPayload()])->assertOk()->assertJsonPath('status', 'rejected');
        $this->assertFalse($this->room->completedRequests()->exists());
        $this->submit(['request_type' => 'dna_test', ...$this->matchingPayload()])->assertOk()
            ->assertJsonPath('request_id', $this->mixedRequest->id);
        $this->assertDatabaseHas('room_filed_requests', ['request_type' => 'search_warrant']);
        $this->assertFalse($this->room->completedRequests()->where('request_id', $other->id)->exists());
    }

    public function test_same_type_and_combination_can_complete_distinct_requests_independently(): void
    {
        $other = $this->secondRequest();
        $this->submit($this->matchingPayload())->assertOk();
        $this->submit(['request_id' => $other->id, ...$this->matchingPayload()])->assertOk();
        $this->assertSame(2, $this->room->completedRequests()->count());
        $this->assertSame(2, $this->room->filedRequests()->distinct()->count('signature'));
        $this->submit(['request_id' => $other->id, ...$this->matchingPayload()])->assertUnprocessable();
        $this->assertDatabaseCount('room_filed_requests', 2);
    }

    public function test_hidden_gate_is_absent_from_snapshot_and_cannot_be_submitted_directly(): void
    {
        $this->rewardLevel->update(['required_request_id' => $this->mixedRequest->id]);
        Event::fake([ItemsUnlocked::class, RequestFiled::class]);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()->assertJsonPath('room.procedural_requests', []);
        $this->submit($this->matchingPayload())->assertUnprocessable()
            ->assertJsonPath('message', 'This procedural request is unavailable.');
        $this->assertFalse($this->room->completedRequests()->exists());
        $this->assertDatabaseCount('room_filed_requests', 0);
        Event::assertNothingDispatched();

        $this->room->unlockedLevels()->attach($this->rewardLevel->id);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()
            ->assertJsonPath('room.procedural_requests.0.id', $this->mixedRequest->id)
            ->assertJsonPath('room.procedural_requests.0.title', $this->rewardLevel->title);
        $this->submit($this->matchingPayload())->assertOk();
    }

    public function test_initial_gate_is_visible_and_shared_gate_does_not_reveal_other_level_titles(): void
    {
        $this->rewardLevel->update(['is_initial' => true, 'required_request_id' => $this->mixedRequest->id]);
        $hidden = Level::create([
            'zone_id' => $this->rewardLevel->zone_id, 'title' => 'Secret interview', 'details' => 'Secret',
            'order_index' => 3, 'is_initial' => false, 'required_request_id' => $this->mixedRequest->id,
        ]);
        $response = $this->getJson("/api/rooms/{$this->room->id}")->assertOk()
            ->assertJsonCount(1, 'room.procedural_requests');
        $entry = $response->json('room.procedural_requests.0');
        $this->assertSame(['id', 'request_type', 'title'], array_keys($entry));
        $this->assertSame($this->rewardLevel->title, $entry['title']);
        $this->room->unlockedLevels()->attach($hidden->id);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()->assertJsonCount(1, 'room.procedural_requests')
            ->assertJsonPath('room.procedural_requests.0.title', $this->rewardLevel->title.' · '.$hidden->title);
    }

    public function test_standalone_requests_can_discover_levels_and_approval_survives_snapshot_reload(): void
    {
        $other = $this->secondRequest();
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()->assertJsonCount(2, 'room.procedural_requests')
            ->assertJsonPath('room.procedural_requests.0.title', $this->rewardEvidence->title)
            ->assertJsonPath('room.procedural_requests.1.title', $this->rewardLevel->title);
        $this->submit(['request_id' => $other->id, ...$this->matchingPayload()])->assertOk()
            ->assertJsonPath('unlocked_levels.0.id', $this->rewardLevel->id);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()->assertJsonCount(2, 'room.procedural_requests')
            ->assertJsonPath('room.completed_requests.0.id', $other->id)
            ->assertJsonMissingPath('room.completed_requests.0.required_evidences')
            ->assertJsonMissingPath('room.completed_requests.0.unlocks_level_id');
    }

    public function test_foreign_missing_and_unauthorized_requests_do_not_change_the_room(): void
    {
        $foreignCase = GameCase::create(['title' => 'Other case', 'story' => 'Story', 'XP_on_solve' => 10]);
        $foreign = InvestigationRequest::create(['case_id' => $foreignCase->id, 'request_type' => 'dna_test']);
        foreach ([$foreign->id, 999999] as $id) {
            $this->submit(['request_id' => $id, ...$this->matchingPayload()])->assertUnprocessable()
                ->assertJsonPath('message', 'This procedural request is unavailable.');
        }
        Sanctum::actingAs(User::factory()->create());
        $this->submit($this->matchingPayload())->assertForbidden();
        $this->assertFalse($this->room->completedRequests()->exists());
        $this->assertDatabaseCount('room_filed_requests', 0);
    }

    public function test_duplicate_ids_do_not_satisfy_minimum_item_requirement(): void
    {
        $this->submit(['evidence_ids' => [$this->initialEvidenceA->id, $this->initialEvidenceA->id]])
            ->assertUnprocessable()->assertJsonValidationErrors('evidence_ids.0');
        $this->assertFalse($this->room->completedRequests()->exists());
    }

    public function test_request_title_includes_both_rewards_when_it_opens_a_level_and_evidence(): void
    {
        $this->mixedRequest->update(['unlocks_level_id' => $this->rewardLevel->id]);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()
            ->assertJsonPath('room.procedural_requests.0.title', $this->rewardLevel->title.' · '.$this->rewardEvidence->title)
            ->assertJsonMissingPath('room.procedural_requests.0.unlocks_evidence_id')
            ->assertJsonMissingPath('room.procedural_requests.0.required_evidences');
    }

    public function test_request_titles_never_expose_rewards_from_other_cases(): void
    {
        $foreignCase = GameCase::create(['title' => 'Other case', 'story' => 'Story', 'XP_on_solve' => 10]);
        $foreignEvidence = Evidence::create(['case_id' => $foreignCase->id, 'title' => 'Private evidence', 'evidence_type' => 'document', 'is_initial' => false]);
        $foreignZone = Zone::create(['case_id' => $foreignCase->id, 'title' => 'Other zone', 'order_index' => 1]);
        $foreignLevel = Level::create(['zone_id' => $foreignZone->id, 'title' => 'Private level', 'details' => 'Secret', 'order_index' => 1, 'is_initial' => false]);
        $this->mixedRequest->update(['unlocks_evidence_id' => $foreignEvidence->id, 'unlocks_level_id' => $foreignLevel->id]);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()->assertJsonPath('room.procedural_requests.0.title', '');
    }

    public function test_legacy_completion_prevents_refiling_without_rewriting_history(): void
    {
        $this->room->completedRequests()->attach($this->mixedRequest->id);
        $legacySignature = hash('sha256', 'legacy');
        $this->room->filedRequests()->create([
            'request_type' => 'search_warrant', 'signature' => $legacySignature,
            'evidence_ids' => [$this->initialEvidenceA->id], 'character_ids' => [$this->initialCharacter->id],
        ]);
        $this->submit($this->matchingPayload())->assertUnprocessable();
        $this->assertSame($legacySignature, $this->room->filedRequests()->first()->signature);
        $this->getJson("/api/rooms/{$this->room->id}")->assertOk()->assertJsonPath('room.completed_requests.0.id', $this->mixedRequest->id);
    }

    public function test_success_event_identifies_the_completed_request_and_repeated_attempt_has_no_side_effects(): void
    {
        Event::fake([ItemsUnlocked::class, RequestFiled::class]);
        $this->submit($this->matchingPayload())->assertOk();
        $this->submit($this->matchingPayload())->assertUnprocessable();
        Event::assertDispatchedTimes(RequestFiled::class, 1);
        Event::assertDispatched(RequestFiled::class,
            fn ($event) => $event->broadcastWith()['request_id'] === $this->mixedRequest->id);
        $this->assertDatabaseCount('room_filed_requests', 1);
    }
}
