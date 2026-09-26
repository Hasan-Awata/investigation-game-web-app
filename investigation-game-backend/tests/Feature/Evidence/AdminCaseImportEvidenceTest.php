<?php

namespace Tests\Feature\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCaseImportEvidenceTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    /**
     * Only the evidence pass is exercised; the remaining passes loop over the
     * empty arrays below.
     *
     * @param  array<int, array<string, mixed>>  $evidences
     * @return array<string, mixed>
     */
    private function payload(array $evidences): array
    {
        return [
            'case_details' => [
                'title' => 'The Ashworth Case',
                'story' => 'A fire, a missing will, and a locked study.',
            ],
            'evidences' => $evidences,
            'characters' => [],
            'investigation_requests' => [],
            'zones' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function pages(): array
    {
        return [
            'pages' => [[
                'id' => 'page-1',
                'blocks' => [[
                    'id' => 'block-1',
                    'type' => 'text',
                    'props' => ['html' => '<p>Imported.</p>'],
                ]],
            ]],
        ];
    }

    public function test_it_imports_evidence_with_a_resolved_presentation(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/cases/import', $this->payload([
            [
                'ref_id' => 'ev_report',
                'title' => 'Fire Report',
                'evidence_type' => EvidenceType::Forensic->value,
                'content_payload' => $this->pages(),
                'is_initial' => true,
            ],
            [
                'ref_id' => 'ev_ballistics',
                'title' => 'Trajectory',
                'evidence_type' => EvidenceType::Ballistics->value,
                'content_payload' => $this->pages(),
            ],
        ]));

        $response->assertCreated();

        $case = GameCase::where('title', 'The Ashworth Case')->firstOrFail();

        $this->assertSame(2, $case->evidences()->count());

        $report = $case->evidences()->where('title', 'Fire Report')->firstOrFail();

        $this->assertSame(ViewerStrategy::Paper, $report->viewer_strategy);
        $this->assertSame(PaperFinish::Blank, $report->paper_finish);
        $this->assertTrue($report->is_initial);
        $this->assertSame(0, $report->order_index);
        $this->assertSame('<p>Imported.</p>', $report->content_payload['pages'][0]['blocks'][0]['props']['html']);

        // Ballistics picks up the manila default without being told to.
        $ballistics = $case->evidences()->where('title', 'Trajectory')->firstOrFail();

        $this->assertSame(PaperFinish::Manila, $ballistics->paper_finish);
        $this->assertSame(1, $ballistics->order_index);
    }

    public function test_it_honours_an_explicit_strategy_override(): void
    {
        $this->actingAs($this->admin())->postJson('/api/admin/cases/import', $this->payload([
            [
                'title' => 'Camera Roll',
                'evidence_type' => EvidenceType::Digital->value,
                'viewer_strategy' => ViewerStrategy::Paper->value,
                'paper_finish' => PaperFinish::Manila->value,
                'content_payload' => $this->pages(),
            ],
        ]))->assertCreated();

        $evidence = Evidence::sole();

        $this->assertSame(ViewerStrategy::Paper, $evidence->viewer_strategy);
        $this->assertSame(PaperFinish::Manila, $evidence->paper_finish);
    }

    public function test_it_rejects_an_illegal_strategy_with_a_dotted_path(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/cases/import', $this->payload([
            [
                'title' => 'Wrong',
                'evidence_type' => EvidenceType::Document->value,
                'viewer_strategy' => ViewerStrategy::Media->value,
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('evidences.0.viewer_strategy');
    }

    public function test_it_rejects_an_illegal_finish_with_a_dotted_path(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/cases/import', $this->payload([
            [
                'title' => 'Wrong',
                'evidence_type' => EvidenceType::Image->value,
                'paper_finish' => PaperFinish::Manila->value,
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('evidences.0.paper_finish');
    }

    public function test_it_rejects_a_payload_the_viewer_could_not_render(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/cases/import', $this->payload([
            [
                'title' => 'Broken',
                'evidence_type' => EvidenceType::Document->value,
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>x</p>', 'size' => 'gigantic'],
                        ]],
                    ]],
                ],
            ],
        ]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.size', $response->json('errors'));
    }

    public function test_a_failed_import_rolls_the_whole_case_back(): void
    {
        $this->actingAs($this->admin())->postJson('/api/admin/cases/import', $this->payload([
            [
                'title' => 'Fine',
                'evidence_type' => EvidenceType::Document->value,
                'content_payload' => $this->pages(),
            ],
            [
                'title' => 'Broken',
                'evidence_type' => EvidenceType::Document->value,
                'content_payload' => $this->pages(),
                'viewer_strategy' => ViewerStrategy::Artifact->value,
            ],
        ]))->assertStatus(422);

        $this->assertDatabaseCount('cases', 0);
        $this->assertDatabaseCount('evidences', 0);
    }
}
