<?php

namespace Tests\Feature\Admin;

use App\Models\GameCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\Support\CaseBundleFactory;
use Tests\TestCase;

class CaseBundleRoundTripTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private const FIXTURES = __DIR__.'/../../Fixtures/case-bundles';

    public function test_full_bundle_import_export_reimport_round_trips(): void
    {
        $this->actingAsAdmin();

        $first = $this->importBundle(self::FIXTURES.'/full.zip');
        $first->assertStatus(201);

        $case = GameCase::findOrFail($first->json('case_id'));
        $original = $this->graphSnapshot($case);

        // Sanity-check the graph actually landed before we round-trip it.
        $this->assertSame(2, $case->evidences()->count());
        $this->assertSame(1, $case->characters()->count());
        $this->assertSame(1, $case->investigationRequests()->count());
        $this->assertSame(2, $case->levels()->count());

        $export = $this->get("/api/admin/cases/{$case->id}/export");
        $export->assertOk();
        $export->assertDownload();

        $exportPath = tempnam(sys_get_temp_dir(), 'round_trip_').'.zip';
        copy($export->baseResponse->getFile()->getPathname(), $exportPath);

        // Free the title so the add-only import accepts the round-tripped bundle.
        $case->delete();

        $second = $this->importBundle($exportPath);
        $second->assertStatus(201);

        $reimported = GameCase::findOrFail($second->json('case_id'));

        $this->assertSame($original, $this->graphSnapshot($reimported));
    }

    public function test_minimal_bundle_imports_without_media(): void
    {
        $this->actingAsAdmin();

        $response = $this->importBundle(self::FIXTURES.'/minimal.zip');
        $response->assertStatus(201);

        $case = GameCase::findOrFail($response->json('case_id'));

        $this->assertSame('Minimal Case', $case->title);
        $this->assertSame(0, $case->evidences()->count());
        $this->assertSame(1, $case->zones()->count());
        $this->assertNull($case->getRawOriginal('img_url'));
    }

    public function test_factory_built_bundle_imports(): void
    {
        $this->actingAsAdmin();

        $path = CaseBundleFactory::build(CaseBundleFactory::minimalManifest());

        $this->importBundle($path)->assertStatus(201);

        $this->assertDatabaseHas('cases', ['title' => 'Factory Case']);
    }

    /**
     * Flatten the graph into an id-free, label-based structure so two imports of
     * the same bundle compare equal even though database ids differ.
     */
    private function graphSnapshot(GameCase $case): array
    {
        $case->load([
            'zones.levels.questions.choices',
            'evidences',
            'characters',
            'investigationRequests.requiredEvidences',
            'investigationRequests.requiredCharacters',
        ]);

        $evidenceRef = fn ($id) => $id ? $case->evidences->firstWhere('id', $id)?->title : null;
        $characterRef = fn ($id) => $id ? $case->characters->firstWhere('id', $id)?->name : null;
        $levels = $case->zones->flatMap->levels;
        $levelRef = fn ($id) => $id ? $levels->firstWhere('id', $id)?->title : null;
        $requestRef = fn ($id) => $id ? $case->investigationRequests->firstWhere('id', $id)?->request_type?->value : null;
        $choices = $levels->flatMap->questions->flatMap->choices;
        $choiceRef = fn ($id) => $id ? $choices->firstWhere('id', $id)?->text : null;

        return [
            'case' => [
                'title' => $case->title,
                'story' => $case->story,
                'map_url' => $case->map_url,
                'cover' => $case->getRawOriginal('img_url'),
                'min_player_XP' => (int) $case->min_player_XP,
                'XP_on_solve' => (int) $case->XP_on_solve,
                'max_strikes' => (int) $case->max_strikes,
                'rating_stars' => (float) $case->rating_stars,
                'age_rating' => $case->age_rating,
                'estimated_playtime' => $case->estimated_playtime,
                'difficulty' => $case->difficulty,
                'tags' => $case->tags,
                'author_name' => $case->author_name,
                'is_published' => (bool) $case->is_published,
            ],
            'evidences' => $case->evidences->sortBy('title')->map(fn ($e) => [
                'title' => $e->title,
                'type' => $e->evidence_type->value,
                'img' => $e->getRawOriginal('img_url'),
                'audio' => $e->getRawOriginal('audio_url'),
                'is_initial' => (bool) $e->is_initial,
                'vital' => (bool) $e->is_vital_for_conviction,
                'metadata' => $e->metadata,
            ])->values()->all(),
            'characters' => $case->characters->sortBy('name')->map(fn ($c) => [
                'name' => $c->name,
                'img' => $c->getRawOriginal('img_url'),
                'is_initial' => (bool) $c->is_initial,
                'is_guilty' => (bool) $c->is_guilty,
                'charge' => $c->charge?->value,
                'status' => $c->default_status?->value,
            ])->values()->all(),
            'requests' => $case->investigationRequests->map(fn ($r) => [
                'type' => $r->request_type->value,
                'unlocks_evidence' => $evidenceRef($r->unlocks_evidence_id),
                'unlocks_level' => $levelRef($r->unlocks_level_id),
                'required_evidences' => $r->requiredEvidences->map(fn ($e) => $e->title)->sort()->values()->all(),
                'required_characters' => $r->requiredCharacters->map(fn ($c) => $c->name)->sort()->values()->all(),
            ])->sortBy('type')->values()->all(),
            'zones' => $case->zones->sortBy('order_index')->map(function ($zone) use ($evidenceRef, $characterRef, $levelRef, $requestRef, $choiceRef) {
                return [
                    'title' => $zone->title,
                    'order' => (int) $zone->order_index,
                    'coord_x' => $zone->coord_x !== null ? (float) $zone->coord_x : null,
                    'coord_y' => $zone->coord_y !== null ? (float) $zone->coord_y : null,
                    'levels' => $zone->levels->sortBy('order_index')->map(function ($level) use ($evidenceRef, $characterRef, $levelRef, $requestRef, $choiceRef) {
                        $questions = $level->questions->values();
                        $indexByQuestionId = array_flip($questions->pluck('id')->all());

                        return [
                            'title' => $level->title,
                            'details' => $level->details,
                            'order' => (int) $level->order_index,
                            'is_initial' => (bool) $level->is_initial,
                            'presentation_type' => $level->presentation_type->value,
                            'required_request' => $requestRef($level->required_request_id),
                            'img' => $level->getRawOriginal('img_url'),
                            'nodes' => $questions->map(function ($question) use ($indexByQuestionId, $evidenceRef, $characterRef, $levelRef, $choiceRef) {
                                return [
                                    'text' => $question->text,
                                    'img' => $question->getRawOriginal('img_url'),
                                    'audio' => $question->getRawOriginal('audio_url'),
                                    'choices' => $question->choices->map(function ($choice) use ($indexByQuestionId, $evidenceRef, $characterRef, $levelRef, $choiceRef) {
                                        $outcomes = $choice->outcomes ?? [];
                                        $requirements = $choice->requirements ?? [];

                                        return [
                                            'text' => $choice->text,
                                            'outcomes' => [
                                                'feedback' => $outcomes['feedback'] ?? null,
                                                'gives_strike' => array_key_exists('gives_strike', $outcomes) ? (bool) $outcomes['gives_strike'] : null,
                                                'next_question_index' => isset($outcomes['next_question_id'])
                                                    ? ($indexByQuestionId[$outcomes['next_question_id']] ?? null)
                                                    : null,
                                                'unlock_evidence' => array_map($evidenceRef, $outcomes['unlock_evidence'] ?? []),
                                                'unlock_levels' => array_map($levelRef, $outcomes['unlock_levels'] ?? []),
                                                'character_updates' => array_map(fn ($u) => [
                                                    'name' => $characterRef($u['id']),
                                                    'is_unlocked' => $u['is_unlocked'] ?? null,
                                                    'status' => $u['status'] ?? null,
                                                ], $outcomes['character_updates'] ?? []),
                                            ],
                                            'requirements' => [
                                                'required_evidence' => array_map($evidenceRef, $requirements['required_evidence'] ?? []),
                                                'required_choices' => array_map($choiceRef, $requirements['required_choices'] ?? []),
                                            ],
                                        ];
                                    })->values()->all(),
                                ];
                            })->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ];
    }
}
