<?php

namespace Database\Factories;

use App\Enums\AssetKind;
use App\Enums\EvidenceDisk;
use App\Models\Evidence;
use App\Models\EvidenceAsset;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EvidenceAsset>
 */
class EvidenceAssetFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'evidence_id' => Evidence::factory(),
            'kind' => AssetKind::Image,
            'disk' => EvidenceDisk::Public,
            'path' => 'assets/evidences/'.fake()->uuid().'.jpg',
            'mime' => 'image/jpeg',
            'bytes' => fake()->numberBetween(20_000, 4_000_000),
            'meta' => [
                'width' => fake()->numberBetween(400, 3000),
                'height' => fake()->numberBetween(400, 3000),
            ],
        ];
    }

    public function image(): static
    {
        return $this->state(fn (): array => [
            'kind' => AssetKind::Image,
            'mime' => 'image/jpeg',
            'meta' => [
                'width' => fake()->numberBetween(400, 3000),
                'height' => fake()->numberBetween(400, 3000),
            ],
        ]);
    }

    public function audio(): static
    {
        return $this->state(fn (): array => [
            'kind' => AssetKind::Audio,
            'path' => 'assets/evidences/'.fake()->uuid().'.mp3',
            'mime' => 'audio/mpeg',
            'meta' => ['duration' => fake()->numberBetween(5, 900)],
        ]);
    }

    public function model(): static
    {
        return $this->state(fn (): array => [
            'kind' => AssetKind::Model3d,
            'path' => 'assets/evidences/'.fake()->uuid().'.glb',
            'mime' => 'model/gltf-binary',
            'meta' => null,
        ]);
    }
}
