<?php

namespace App\Services\Evidence;

use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Exceptions\IllegalEvidencePresentationException;

/**
 * The rules that decide which viewer strategies and paper finishes an evidence
 * type may use.
 *
 * The rationale behind the overrides:
 *   - image/audio are only ever a photo or a clip, so they cannot be re-skinned
 *     as a document without the media becoming unreachable
 *   - custom means "anything not covered by the built-in types", so it gets the
 *     sandboxed artifact surface and nothing else
 *   - a digital log read as a printed transcript is a legitimate authoring
 *     choice, and a report scanned from a terminal is equally legitimate, so
 *     the two paper-backed strategies are interchangeable for those types
 */
class ViewerStrategyLegality
{
    /**
     * @return list<ViewerStrategy>
     */
    public function allowedStrategies(EvidenceType $type): array
    {
        return match ($type) {
            EvidenceType::Image, EvidenceType::Audio => [ViewerStrategy::Media],
            EvidenceType::Custom => [ViewerStrategy::Artifact],
            EvidenceType::Digital => [ViewerStrategy::Terminal, ViewerStrategy::Paper],
            EvidenceType::Document,
            EvidenceType::Forensic,
            EvidenceType::Ballistics,
            EvidenceType::Testimony => [ViewerStrategy::Paper, ViewerStrategy::Terminal],
        };
    }

    public function isLegal(EvidenceType $type, ViewerStrategy $strategy): bool
    {
        return in_array($strategy, $this->allowedStrategies($type), true);
    }

    /**
     * @throws IllegalEvidencePresentationException
     */
    public function assertLegal(EvidenceType $type, ViewerStrategy $strategy): void
    {
        if (! $this->isLegal($type, $strategy)) {
            throw IllegalEvidencePresentationException::forStrategy(
                $type,
                $strategy,
                $this->allowedStrategies($type)
            );
        }
    }

    /**
     * The paper stock an evidence type gets when the author did not choose one.
     * Ballistics reports are conventionally filed in a manila envelope.
     */
    public function defaultFinish(EvidenceType $type): PaperFinish
    {
        return $type === EvidenceType::Ballistics
            ? PaperFinish::Manila
            : PaperFinish::Blank;
    }

    /**
     * A finish is only meaningful on a physical sheet. Terminal, media and
     * artifact presentations have no paper, so carrying a finish there is
     * invalid state rather than a harmless extra.
     */
    public function isLegalFinish(ViewerStrategy $strategy, ?PaperFinish $finish): bool
    {
        return $strategy === ViewerStrategy::Paper ? $finish instanceof PaperFinish : $finish === null;
    }

    /**
     * @throws IllegalEvidencePresentationException
     */
    public function assertLegalFinish(EvidenceType $type, ViewerStrategy $strategy, ?PaperFinish $finish): void
    {
        if (! $this->isLegalFinish($strategy, $finish)) {
            throw IllegalEvidencePresentationException::forFinish($type, $strategy, $finish?->value);
        }
    }

    /**
     * True when the evidence must carry a paginated block payload.
     */
    public function requiresPages(ViewerStrategy $strategy): bool
    {
        return $strategy === ViewerStrategy::Paper || $strategy === ViewerStrategy::Terminal;
    }
}
