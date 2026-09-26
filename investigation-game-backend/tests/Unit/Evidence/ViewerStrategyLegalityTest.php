<?php

namespace Tests\Unit\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Exceptions\IllegalEvidencePresentationException;
use App\Services\Evidence\ViewerStrategyLegality;
use Tests\TestCase;

class ViewerStrategyLegalityTest extends TestCase
{
    private ViewerStrategyLegality $legality;

    protected function setUp(): void
    {
        parent::setUp();

        $this->legality = new ViewerStrategyLegality;
    }

    public function test_media_only_types_cannot_be_re_skinned(): void
    {
        foreach ([EvidenceType::Image, EvidenceType::Audio] as $type) {
            $this->assertSame(
                [ViewerStrategy::Media],
                $this->legality->allowedStrategies($type),
                "{$type->value} should only ever render as media"
            );
        }
    }

    public function test_custom_is_artifact_only(): void
    {
        $this->assertSame(
            [ViewerStrategy::Artifact],
            $this->legality->allowedStrategies(EvidenceType::Custom)
        );
    }

    public function test_digital_may_be_read_as_a_printed_transcript(): void
    {
        $this->assertTrue($this->legality->isLegal(EvidenceType::Digital, ViewerStrategy::Terminal));
        $this->assertTrue($this->legality->isLegal(EvidenceType::Digital, ViewerStrategy::Paper));
        $this->assertFalse($this->legality->isLegal(EvidenceType::Digital, ViewerStrategy::Media));
        $this->assertFalse($this->legality->isLegal(EvidenceType::Digital, ViewerStrategy::Artifact));
    }

    public function test_paper_backed_types_may_use_the_terminal_chrome(): void
    {
        $paperBacked = [
            EvidenceType::Document,
            EvidenceType::Forensic,
            EvidenceType::Ballistics,
            EvidenceType::Testimony,
        ];

        foreach ($paperBacked as $type) {
            $this->assertTrue($this->legality->isLegal($type, ViewerStrategy::Paper));
            $this->assertTrue($this->legality->isLegal($type, ViewerStrategy::Terminal));
            $this->assertFalse($this->legality->isLegal($type, ViewerStrategy::Media));
            $this->assertFalse($this->legality->isLegal($type, ViewerStrategy::Artifact));
        }
    }

    public function test_assert_legal_throws_with_the_allowed_set_in_the_message(): void
    {
        try {
            $this->legality->assertLegal(EvidenceType::Image, ViewerStrategy::Paper);
            $this->fail('Expected an IllegalEvidencePresentationException.');
        } catch (IllegalEvidencePresentationException $exception) {
            $this->assertStringContainsString('image', $exception->getMessage());
            $this->assertStringContainsString('media', $exception->getMessage());
        }
    }

    public function test_ballistics_files_its_report_in_manila(): void
    {
        $this->assertSame(PaperFinish::Manila, $this->legality->defaultFinish(EvidenceType::Ballistics));

        foreach ([EvidenceType::Document, EvidenceType::Forensic, EvidenceType::Testimony] as $type) {
            $this->assertSame(PaperFinish::Blank, $this->legality->defaultFinish($type));
        }
    }

    public function test_a_finish_is_only_meaningful_on_actual_paper(): void
    {
        $this->assertTrue($this->legality->isLegalFinish(ViewerStrategy::Paper, PaperFinish::Blank));
        $this->assertTrue($this->legality->isLegalFinish(ViewerStrategy::Paper, PaperFinish::Manila));

        foreach ([ViewerStrategy::Terminal, ViewerStrategy::Media, ViewerStrategy::Artifact] as $strategy) {
            $this->assertTrue(
                $this->legality->isLegalFinish($strategy, null),
                "{$strategy->value} has no paper, so a null finish must be legal"
            );
            $this->assertFalse(
                $this->legality->isLegalFinish($strategy, PaperFinish::Blank),
                "{$strategy->value} has no paper, so a finish must be rejected"
            );
        }
    }

    public function test_only_paged_strategies_require_a_block_payload(): void
    {
        $this->assertTrue($this->legality->requiresPages(ViewerStrategy::Paper));
        $this->assertTrue($this->legality->requiresPages(ViewerStrategy::Terminal));
        $this->assertFalse($this->legality->requiresPages(ViewerStrategy::Media));
        $this->assertFalse($this->legality->requiresPages(ViewerStrategy::Artifact));
    }
}
