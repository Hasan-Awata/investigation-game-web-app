<?php

namespace Database\Factories;

use App\Enums\EvidenceType;
use App\Enums\ViewerStrategy;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Services\Evidence\PresentationResolver;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Evidence>
 *
 * The presentation fields and the payload are both derived rather than
 * hard-coded, so a change to the legality rules or the block catalog
 * automatically produces a factory that still satisfies the invariants.
 */
class EvidenceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(EvidenceType::cases());
        $presentation = app(PresentationResolver::class)->defaultsFor($type);

        return [
            'case_id' => GameCase::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'evidence_type' => $type,
            'viewer_strategy' => $presentation['viewer_strategy'],
            'paper_finish' => $presentation['paper_finish'],
            'is_initial' => fake()->boolean(30),
            'is_vital_for_conviction' => fake()->boolean(40),
            'order_index' => fake()->numberBetween(0, 50),
            'content_payload' => $this->payloadFor($presentation['viewer_strategy']),
        ];
    }

    public function ofType(EvidenceType $type, ?ViewerStrategy $strategy = null): static
    {
        $presentation = app(PresentationResolver::class)->resolve($type, $strategy);

        return $this->state(fn (): array => [
            'evidence_type' => $type,
            'viewer_strategy' => $presentation['viewer_strategy'],
            'paper_finish' => $presentation['paper_finish'],
            'content_payload' => $this->payloadFor($presentation['viewer_strategy']),
        ]);
    }

    public function initial(): static
    {
        return $this->state(fn (): array => ['is_initial' => true]);
    }

    public function vitalForConviction(): static
    {
        return $this->state(fn (): array => ['is_vital_for_conviction' => true]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function payloadFor(ViewerStrategy $strategy): ?array
    {
        return match ($strategy) {
            ViewerStrategy::Paper, ViewerStrategy::Terminal => [
                'pages' => [
                    [
                        'id' => 'page-1',
                        'blocks' => [
                            [
                                'id' => 'block-1',
                                'type' => 'text',
                                'props' => [
                                    'html' => '<p>'.fake()->sentence().'</p>',
                                    'align' => fake()->randomElement(['left', 'center', 'right', 'justify']),
                                    'size' => fake()->randomElement(['small', 'body', 'lead', 'heading']),
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            ViewerStrategy::Artifact => [
                'kind' => 'html',
                'html' => '<h1>'.fake()->sentence(3).'</h1><p>'.fake()->paragraph().'</p>',
                'css' => 'h1 { color: #222; }',
            ],
            ViewerStrategy::Media => null,
        };
    }
}
