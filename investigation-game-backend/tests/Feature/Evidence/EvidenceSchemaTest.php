<?php

namespace Tests\Feature\Evidence;

use App\Enums\AssetKind;
use App\Enums\EvidenceDisk;
use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Exceptions\IllegalEvidencePresentationException;
use App\Models\Evidence;
use App\Models\EvidenceAsset;
use App\Models\GameCase;
use App\Services\Evidence\ViewerStrategyLegality;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Exercises the rebuilt schema and the presentation invariant against a real
 * database rather than asserting on the migration's own blueprint.
 */
class EvidenceSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_rebuilt_columns_are_present(): void
    {
        foreach ([
            'case_id', 'title', 'description', 'evidence_type', 'viewer_strategy',
            'paper_finish', 'is_initial', 'is_vital_for_conviction', 'order_index',
            'content_payload',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('evidences', $column), "evidences.{$column} is missing");
        }
    }

    public function test_the_legacy_columns_are_gone(): void
    {
        foreach (['theme', 'pages', 'img_url', 'audio_url', 'level_id', 'paragraph'] as $column) {
            $this->assertFalse(Schema::hasColumn('evidences', $column), "evidences.{$column} should be gone");
        }
    }

    public function test_evidence_assets_exists(): void
    {
        $this->assertTrue(Schema::hasTable('evidence_assets'));

        foreach (['evidence_id', 'kind', 'disk', 'path', 'mime', 'bytes', 'meta'] as $column) {
            $this->assertTrue(Schema::hasColumn('evidence_assets', $column), "evidence_assets.{$column} is missing");
        }
    }

    public function test_deleting_a_case_cascades_to_its_evidence_and_assets(): void
    {
        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Document)
            ->create();

        $evidence->assets()->create([
            'kind' => AssetKind::Image,
            'disk' => EvidenceDisk::Public,
            'path' => 'assets/evidences/x.jpg',
        ]);

        $caseId = $evidence->case_id;
        $evidence->gameCase->delete();

        $this->assertSame(0, Evidence::where('case_id', $caseId)->count());
        $this->assertSame(0, EvidenceAsset::count());
    }

    public function test_a_legal_evidence_persists_with_its_resolved_presentation(): void
    {
        $evidence = Evidence::factory()
            ->ofType(EvidenceType::Ballistics)
            ->create();

        $this->assertSame(EvidenceType::Ballistics, $evidence->evidence_type);
        $this->assertSame(ViewerStrategy::Paper, $evidence->viewer_strategy);
        $this->assertSame(PaperFinish::Manila, $evidence->paper_finish);
    }

    public function test_the_model_refuses_an_illegal_strategy(): void
    {
        $this->expectException(IllegalEvidencePresentationException::class);

        Evidence::factory()
            ->ofType(EvidenceType::Image)
            ->create(['viewer_strategy' => ViewerStrategy::Paper]);
    }

    public function test_the_model_refuses_a_paper_finish_on_a_non_paper_strategy(): void
    {
        $this->expectException(IllegalEvidencePresentationException::class);

        Evidence::factory()
            ->ofType(EvidenceType::Audio)
            ->create(['paper_finish' => PaperFinish::Manila]);
    }

    /**
     * The invariant has to hold for every row, not just for rows this test
     * happened to write, so this walks the whole table using the same legality
     * service the model hook uses.
     */
    public function test_every_evidence_type_can_be_created_and_stays_legal(): void
    {
        $legality = app(ViewerStrategyLegality::class);

        foreach (EvidenceType::cases() as $type) {
            $allowed = $legality->allowedStrategies($type);

            foreach ($allowed as $strategy) {
                $evidence = Evidence::factory()
                    ->ofType($type, $strategy)
                    ->create();

                $stored = $evidence->fresh();

                $this->assertTrue(
                    $legality->isLegal($stored->evidence_type, $stored->viewer_strategy),
                    "{$type->value} as {$strategy->value} is not legal"
                );

                $this->assertTrue(
                    $legality->isLegalFinish($stored->viewer_strategy, $stored->paper_finish),
                    "{$type->value} as {$strategy->value} has an illegal finish"
                );
            }
        }

        $this->assertSame(0, Evidence::whereNull('viewer_strategy')->count());
    }

    public function test_order_index_drives_the_board_order(): void
    {
        $case = GameCase::factory()->create();

        $third = Evidence::factory()->ofType(EvidenceType::Document)->create(['case_id' => $case->id, 'order_index' => 30]);
        $first = Evidence::factory()->ofType(EvidenceType::Document)->create(['case_id' => $case->id, 'order_index' => 10]);
        $second = Evidence::factory()->ofType(EvidenceType::Document)->create(['case_id' => $case->id, 'order_index' => 20]);

        $ordered = $case->evidences()->ordered()->pluck('id')->all();

        $this->assertSame([$first->id, $second->id, $third->id], $ordered);
    }
}
