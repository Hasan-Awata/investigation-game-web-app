<?php

namespace Database\Factories;

use App\Models\GameCase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GameCase>
 */
class GameCaseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->unique()->sentence(3),
            'story' => fake()->paragraphs(3, true),
            'min_player_XP' => fake()->numberBetween(0, 500),
            'XP_on_solve' => fake()->numberBetween(100, 2000),
            'max_strikes' => 3,
            'is_published' => fake()->boolean(70),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => ['is_published' => true]);
    }
}
