<?php

namespace App\Services\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Exceptions\IllegalEvidencePresentationException;

/**
 * Produces the presentation an evidence should actually be stored with.
 *
 * An author-supplied strategy is honoured when it is legal for the type and
 * silently falls back to the type default when it is not. The strict version of
 * that check lives in ViewerStrategyLegality and is what the model hook uses to
 * reject bad writes; this class exists so imports and the admin form can accept
 * "whatever looks right" input without crashing the whole batch.
 */
class PresentationResolver
{
    public function __construct(private readonly ViewerStrategyLegality $legality) {}

    /**
     * @return array{viewer_strategy: ViewerStrategy, paper_finish: PaperFinish|null}
     */
    public function defaultsFor(EvidenceType $type): array
    {
        $strategy = $this->defaultStrategyFor($type);

        return [
            'viewer_strategy' => $strategy,
            'paper_finish' => $this->resolveFinish($type, $strategy),
        ];
    }

    public function defaultStrategyFor(EvidenceType $type): ViewerStrategy
    {
        $allowed = $this->legality->allowedStrategies($type);

        if ($allowed === []) {
            throw IllegalEvidencePresentationException::missingStrategy($type, $allowed);
        }

        return $allowed[0];
    }

    /**
     * @return array{viewer_strategy: ViewerStrategy, paper_finish: PaperFinish|null}
     */
    public function resolve(
        EvidenceType $type,
        ?ViewerStrategy $requestedStrategy = null,
        ?PaperFinish $requestedFinish = null,
    ): array {
        $strategy = $this->resolveStrategy($type, $requestedStrategy);

        return [
            'viewer_strategy' => $strategy,
            'paper_finish' => $this->resolveFinish($type, $strategy, $requestedFinish),
        ];
    }

    public function resolveStrategy(EvidenceType $type, ?ViewerStrategy $requested): ViewerStrategy
    {
        if ($requested instanceof ViewerStrategy && $this->legality->isLegal($type, $requested)) {
            return $requested;
        }

        return $this->defaultStrategyFor($type);
    }

    /**
     * A legal finish is kept, an illegal one is dropped, and a missing one
     * falls back to the type default when the strategy actually renders paper.
     */
    public function resolveFinish(
        EvidenceType $type,
        ViewerStrategy $strategy,
        ?PaperFinish $requested = null,
    ): ?PaperFinish {
        if ($strategy !== ViewerStrategy::Paper) {
            return null;
        }

        if ($requested instanceof PaperFinish) {
            return $requested;
        }

        return $this->legality->defaultFinish($type);
    }
}
