<?php

namespace Tests\Feature;

use App\Models\Evidence;
use App\Models\GameCase;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class BackgroundCheckMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_upgrade_preserves_fields_and_leaves_current_dossiers_intact(): void
    {
        $values = [
            'subject' => 'جان-لوك غريف',
            'portrait' => '/assets/cases/1-example/Characters/portrait.png',
            'notes' => 'Saved findings',
            'arrests' => [['description' => 'Charge 41-S', 'disposition' => 'Released']],
        ];
        $first = $this->evidence(1, $values + ['fingerprints' => '']);
        $second = $this->evidence(2, $values + ['aliases' => 'Saved alias']);
        $current = $this->evidence(3, $values + ['fingerprint_asset' => 'loop']);
        $original = $current->metadata;

        $this->migration()->up();

        $this->assertSame([
            'template' => ['id' => 'background_check', 'version' => 3, 'values' => $values + ['stamp_asset' => 'filed']],
            'other_metadata' => 'Keep',
        ], $first->fresh()->metadata);
        $this->assertSame($values + ['aliases' => 'Saved alias', 'stamp_asset' => 'filed'], $second->fresh()->metadata['template']['values']);
        $this->assertSame($original, $current->fresh()->metadata);
        $this->assertTrue($first->fresh()->is_initial);
    }

    public function test_upgrade_rolls_back_if_a_record_still_uses_uploaded_artwork(): void
    {
        $first = $this->evidence(1, ['subject' => 'First subject']);
        $second = $this->evidence(2, ['subject' => 'Second subject', 'right_thumb' => '/assets/example.png']);

        try {
            $this->migration()->up();
            $this->fail('Expected migration to stop before dropping uploaded artwork.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString("evidence {$second->id} still uses uploaded artwork", $error->getMessage());
        }

        $this->assertSame($first->metadata, $first->fresh()->metadata);
        $this->assertSame($second->metadata, $second->fresh()->metadata);
    }

    private function evidence(int $version, array $values): Evidence
    {
        $case = GameCase::create(['title' => 'Migration case', 'story' => 'Story', 'XP_on_solve' => 0]);

        return Evidence::create([
            'case_id' => $case->id,
            'title' => 'Dossier',
            'evidence_type' => 'document',
            'is_initial' => true,
            'metadata' => [
                'template' => ['id' => 'background_check', 'version' => $version, 'values' => $values],
                'other_metadata' => 'Keep',
            ],
        ]);
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_11_19_000001_upgrade_background_checks_to_version_three.php');
    }
}
