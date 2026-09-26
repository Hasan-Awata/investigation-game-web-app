<?php

namespace Tests\Feature\Evidence;

use App\Enums\EvidenceBlockType;
use App\Enums\EvidenceType;
use App\Enums\ViewerStrategy;
use App\Models\User;
use App\Services\Evidence\ViewerStrategyLegality;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminEvidenceSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    public function test_the_schema_endpoint_serves_the_block_catalog(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/admin/evidence-schema');

        $response->assertOk();
        $response->assertJsonCount(count(EvidenceBlockType::cases()), 'blocks');

        $this->assertSame(
            array_column(EvidenceBlockType::cases(), 'value'),
            array_column($response->json('blocks'), 'type')
        );
    }

    public function test_the_schema_endpoint_describes_the_paper_and_presentation_enums(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/admin/evidence-schema');

        $response->assertJsonPath('paper.width', 794);
        $response->assertJsonPath('paper.height', 1123);
        $response->assertJsonPath('paper.finishes', ['blank', 'manila']);
        $response->assertJsonPath('strategies', ['paper', 'terminal', 'media', 'artifact']);
        $response->assertJsonPath('model_3d_enabled', false);

        $this->assertCount(8, $response->json('types'));
    }

    public function test_the_schema_endpoint_reflects_the_3d_flag(): void
    {
        config()->set('evidence.features.model_3d', true);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/evidence-schema')
            ->assertJsonPath('model_3d_enabled', true);
    }

    public function test_the_signatures_endpoint_lists_the_shipped_svgs(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/admin/signatures');

        $response->assertOk();

        $signatures = $response->json('signatures');

        $this->assertNotEmpty($signatures);

        // Ids are sequential from 1 with no zero, and every path is a
        // forward-slash URL even though the files are scanned from disk.
        $this->assertSame(range(1, count($signatures)), array_column($signatures, 'id'));

        foreach ($signatures as $signature) {
            $this->assertStringStartsWith('/assets/signatures/', $signature['path']);
            $this->assertStringEndsWith('.svg', $signature['path']);
        }
    }

    public function test_the_schema_endpoint_is_admin_only(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/admin/evidence-schema')
            ->assertForbidden();
    }

    /**
     * The admin form builds its strategy picker from the served rules, so those
     * rules have to be the same ones the write path validates against. Asserting
     * them against the legality service is what stops a second, stale copy of
     * the matrix from creeping into the client.
     */
    public function test_the_served_strategy_rules_match_the_legality_service(): void
    {
        $legality = app(ViewerStrategyLegality::class);

        $rules = $this->actingAs($this->admin())
            ->getJson('/api/admin/evidence-schema')
            ->json('strategy_rules');

        $this->assertIsArray($rules);
        $this->assertCount(count(EvidenceType::cases()), $rules);

        foreach (EvidenceType::cases() as $type) {
            $expected = array_map(
                static fn (ViewerStrategy $strategy): string => $strategy->value,
                $legality->allowedStrategies($type)
            );

            $this->assertSame($expected, $rules[$type->value]['strategies'], "strategies for {$type->value}");
            $this->assertSame(
                $expected === [] ? null : $expected[0],
                $rules[$type->value]['default_strategy'],
                "default strategy for {$type->value}"
            );
            $this->assertSame(
                $legality->defaultFinish($type)->value,
                $rules[$type->value]['default_finish'],
                "default finish for {$type->value}"
            );
        }
    }

    public function test_media_and_custom_are_locked_to_a_single_strategy(): void
    {
        $rules = $this->actingAs($this->admin())
            ->getJson('/api/admin/evidence-schema')
            ->json('strategy_rules');

        // A photo cannot be re-skinned as a document, and a custom artifact has
        // no other surface, so both offer exactly one choice.
        $this->assertSame(['media'], $rules['image']['strategies']);
        $this->assertSame(['media'], $rules['audio']['strategies']);
        $this->assertSame(['artifact'], $rules['custom']['strategies']);

        // None of them page, so no page builder should be offered for them.
        $this->assertFalse($rules['image']['is_paged']);
        $this->assertFalse($rules['custom']['is_paged']);
    }
}
