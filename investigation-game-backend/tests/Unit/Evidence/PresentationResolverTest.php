<?php

namespace Tests\Unit\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Services\Evidence\PresentationResolver;
use App\Services\Evidence\ViewerStrategyLegality;
use Tests\TestCase;

class PresentationResolverTest extends TestCase
{
    private PresentationResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resolver = new PresentationResolver(new ViewerStrategyLegality);
    }

    public function test_default_strategy_per_type(): void
    {
        $expected = [
            EvidenceType::Document->value => ViewerStrategy::Paper,
            EvidenceType::Forensic->value => ViewerStrategy::Paper,
            EvidenceType::Ballistics->value => ViewerStrategy::Paper,
            EvidenceType::Testimony->value => ViewerStrategy::Paper,
            EvidenceType::Digital->value => ViewerStrategy::Terminal,
            EvidenceType::Image->value => ViewerStrategy::Media,
            EvidenceType::Audio->value => ViewerStrategy::Media,
            EvidenceType::Custom->value => ViewerStrategy::Artifact,
        ];

        foreach ($expected as $typeValue => $strategy) {
            $this->assertSame(
                $strategy,
                $this->resolver->defaultStrategyFor(EvidenceType::from($typeValue)),
                "Unexpected default strategy for {$typeValue}"
            );
        }
    }

    public function test_defaults_pair_each_type_with_its_paper_stock(): void
    {
        $this->assertSame(
            ['viewer_strategy' => ViewerStrategy::Paper, 'paper_finish' => PaperFinish::Blank],
            $this->resolver->defaultsFor(EvidenceType::Document)
        );

        $this->assertSame(
            ['viewer_strategy' => ViewerStrategy::Paper, 'paper_finish' => PaperFinish::Manila],
            $this->resolver->defaultsFor(EvidenceType::Ballistics)
        );
    }

    public function test_non_paper_strategies_never_carry_a_finish(): void
    {
        foreach ([EvidenceType::Image, EvidenceType::Audio, EvidenceType::Digital, EvidenceType::Custom] as $type) {
            $this->assertNull(
                $this->resolver->defaultsFor($type)['paper_finish'],
                "{$type->value} does not render on paper"
            );
        }
    }

    public function test_a_legal_requested_strategy_is_honoured(): void
    {
        $resolved = $this->resolver->resolve(EvidenceType::Document, ViewerStrategy::Terminal);

        $this->assertSame(ViewerStrategy::Terminal, $resolved['viewer_strategy']);
    }

    public function test_an_illegal_requested_strategy_falls_back_instead_of_throwing(): void
    {
        $resolved = $this->resolver->resolve(EvidenceType::Image, ViewerStrategy::Paper);

        $this->assertSame(ViewerStrategy::Media, $resolved['viewer_strategy']);
    }

    public function test_switching_a_digital_log_to_paper_picks_up_the_blank_sheet(): void
    {
        $resolved = $this->resolver->resolve(EvidenceType::Digital, ViewerStrategy::Paper);

        $this->assertSame(ViewerStrategy::Paper, $resolved['viewer_strategy']);
        $this->assertSame(PaperFinish::Blank, $resolved['paper_finish']);
    }

    public function test_an_explicit_finish_is_kept(): void
    {
        $resolved = $this->resolver->resolve(
            EvidenceType::Document,
            ViewerStrategy::Paper,
            PaperFinish::Manila
        );

        $this->assertSame(PaperFinish::Manila, $resolved['paper_finish']);
    }

    public function test_a_finish_supplied_for_a_non_paper_strategy_is_discarded(): void
    {
        $resolved = $this->resolver->resolve(
            EvidenceType::Custom,
            ViewerStrategy::Artifact,
            PaperFinish::Manila
        );

        $this->assertNull($resolved['paper_finish']);
    }
}
