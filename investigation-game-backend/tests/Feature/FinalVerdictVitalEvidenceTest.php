<?php

namespace Tests\Feature;

use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Services\AssessmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinalVerdictVitalEvidenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_vital_evidence_possession_satisfies_default_contract_and_explicit_presentation_requires_all_vital_items(): void
    {
        $user = User::create([
            'name' => 'Host',
            'username' => 'host_'.uniqid(),
            'email' => uniqid().'@test.local',
            'password' => 'secret-password',
        ]);
        $case = GameCase::create(['title' => 'Verdict Case', 'story' => 'Story', 'XP_on_solve' => 10]);
        $room = GameRoom::create([
            'case_id' => $case->id,
            'host_user_id' => $user->id,
            'invite_code' => strtoupper(substr(md5(uniqid()), 0, 6)),
            'status' => 'active',
        ]);
        $vitalEvidence = Evidence::create([
            'case_id' => $case->id,
            'title' => 'Vital evidence',
            'evidence_type' => 'document',
            'is_initial' => true,
            'is_vital_for_conviction' => true,
        ]);
        $room->unlockedEvidences()->attach($vitalEvidence->id);

        $assessment = app(AssessmentService::class);
        $explicitOmission = $assessment->evaluateFinalVerdict($room, [], []);

        $this->assertTrue($explicitOmission->isFailure());
        $this->assertSame('The final case must present every piece of vital evidence.', $explicitOmission->errorMessage);

        $possessionFallback = $assessment->evaluateFinalVerdict($room, []);

        $this->assertFalse($possessionFallback->isFailure());
        $this->assertSame('solved', $room->fresh()->status->value);
    }
}
