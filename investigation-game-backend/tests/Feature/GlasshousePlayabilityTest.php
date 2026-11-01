<?php

namespace Tests\Feature;

use App\Models\Choice;
use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Services\AssessmentService;
use App\Services\EncounterGroupService;
use App\Services\GameRoomService;
use App\Services\InvestigationRequestService;
use App\Services\LocationInspectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\Support\CaseBundleFactory;
use Tests\TestCase;

class GlasshousePlayabilityTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    private array $manifest;
    private GameCase $case;
    private User $player;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAdmin();
        $this->manifest = json_decode(file_get_contents(database_path('release-content/glasshouse-files/case.json')), true, flags: JSON_THROW_ON_ERROR);
        // Exercise the actual authored graph; browser checks cover the original media bytes.
        $testManifest = $this->manifest;
        array_walk_recursive($testManifest, function (&$value): void {
            if (is_string($value) && str_starts_with($value, 'media/')) $value = 'media/image.png';
        });
        $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
        $bundle = CaseBundleFactory::build($testManifest, ['media/image.png' => $image]);
        try {
            $id = $this->importBundle($bundle)->assertCreated()->json('case_id');
            $this->case = GameCase::findOrFail($id);
        } finally {
            unlink($bundle);
        }
        config(['queue.default' => 'database']);
        $this->player = User::factory()->create(['XP' => 50]);
    }

    #[DataProvider('lobbyRoutes')]
    public function test_authored_route_reaches_all_perpetrators_and_vital_proof(array $lobby, string $ending = 'perfect'): void
    {
        $room = app(GameRoomService::class)->createRoom($this->case, $this->player)->value;
        $this->request($room, 0);
        $this->interrogate($room, 'lvl_34', $lobby);
        $this->assertSame('available', $room->characters()->where('name', 'رين بوزك')->firstOrFail()->pivot->status);
        $this->inspect($room, 'choice_249');
        $this->inspect($room, 'choice_252');
        $this->inspect($room, 'choice_251');
        $this->inspect($room, 'choice_254');
        $this->request($room, 1);
        $this->request($room, 2);
        $this->interrogate($room, 'lvl_36', ['choice_256', 'choice_258', 'choice_260', 'choice_262', 'choice_265']);
        $this->request($room, 3);
        $this->interrogate($room, 'lvl_37', ['choice_267', 'choice_270', 'choice_271']);
        $this->assertSame('deceased', $room->characters()->where('name', 'جولز واتس')->firstOrFail()->pivot->status);
        $this->assertSame('fled', $room->characters()->where('name', 'مارا فوس')->firstOrFail()->pivot->status);
        $this->interrogate($room, 'lvl_38', ['choice_273', 'choice_276', 'choice_278', 'choice_281', 'choice_283']);
        $guilty = $this->case->characters()->where('is_guilty', true)->pluck('id')->all();
        $this->assertCount(6, $guilty);
        $this->assertSame([], array_values(array_diff($guilty, $room->getUnlockedCharacterIds())));
        $vital = $this->case->evidences()->where('is_vital_for_conviction', true)->pluck('id')->all();
        $this->assertCount(3, $vital);
        if ($ending === 'strikes') {
            for ($strike = 1; $strike <= 3; $strike++) {
                $result = app(AssessmentService::class)->evaluateFinalVerdict($room, array_slice($guilty, 1), $vital);
                $this->assertFalse($result->isFailure());
                $this->assertSame($strike, $room->fresh()->strikes);
                $this->assertSame($strike < 3 ? 'active' : 'failed', $room->fresh()->status->value);
            }
            $this->assertSame(50, $this->player->fresh()->XP);
            $this->assertDatabaseHas('case_user', ['user_id' => $this->player->id, 'status' => 'failed_strikes']);
            $this->start(app(GameRoomService::class)->createRoom($this->case, $this->player)->value, 'lvl_34');
            return;
        }
        if ($ending === 'partial') {
            $guilty[] = $this->case->characters()->where('name', 'كوروين لويس')->firstOrFail()->id;
        }
        $result = app(AssessmentService::class)->evaluateFinalVerdict($room, $guilty, $vital);
        $this->assertFalse($result->isFailure(), $result->errorMessage ?? '');
        $this->assertSame('solved', $room->fresh()->status->value);
        $this->assertSame($ending === 'partial' ? 644 : 950, $this->player->fresh()->XP);
        $this->assertSame(6, $room->fresh()->final_stats['suspects_caught']);
        $this->assertSame('1 minute', $room->fresh()->final_stats['time_taken']);
        $this->assertDatabaseHas('case_user', ['user_id' => $this->player->id, 'status' => $ending === 'partial' ? 'solved_partial' : 'solved_perfect']);
        $replay = app(GameRoomService::class)->createRoom($this->case, $this->player)->value;
        $this->start($replay, 'lvl_34');
        $this->assertSame(0, DB::table('failed_jobs')->count());
    }

    public static function lobbyRoutes(): array
    {
        return [
            'contractor' => [['choice_238', 'choice_241', 'choice_245']],
            'return to ledger' => [['choice_238', 'choice_242', 'choice_244', 'choice_ledger_return', 'choice_245']],
            'partial verdict' => [['choice_238', 'choice_241', 'choice_245'], 'partial'],
            'verdict strikes' => [['choice_238', 'choice_241', 'choice_245'], 'strikes'],
        ];
    }

    public function test_premature_verdict_fails_with_no_reward_and_releases_the_real_case_encounter(): void
    {
        $room = app(GameRoomService::class)->createRoom($this->case, $this->player)->value;
        $this->start($room, 'lvl_34');
        $result = app(AssessmentService::class)->evaluateFinalVerdict($room, []);
        $this->assertFalse($result->isFailure());
        $this->assertSame('failed', $room->fresh()->status->value);
        $this->assertSame(50, $this->player->fresh()->XP);
        $this->assertDatabaseHas('case_user', ['user_id' => $this->player->id, 'status' => 'failed_no_proof']);
        $this->assertSame(0, $room->encounterGroups()->where('status', 'active')->count());
        $next = app(GameRoomService::class)->createRoom($this->case, $this->player)->value;
        $this->start($next, 'lvl_34');
    }

    private function start(GameRoom $room, string $ref): void
    {
        $authored = collect($this->manifest['zones'])->flatMap(fn (array $zone) => $zone['levels'])->firstWhere('ref_id', $ref);
        $level = $this->case->levels()->where('levels.title', $authored['title'])->firstOrFail();
        $result = app(EncounterGroupService::class)->start($room, $level, $this->player);
        $this->assertFalse($result->isFailure(), $result->errorMessage ?? '');
    }

    private function interrogate(GameRoom $room, string $level, array $choices): void
    {
        $this->start($room, $level);
        foreach ($choices as $ref) {
            $group = $room->encounterGroups()->where('status', 'active')->firstOrFail();
            $question = \App\Models\Question::findOrFail($group->current_question_id);
            $choice = $question->choices()->where('text', $this->choiceText($ref))->firstOrFail();
            $result = app(EncounterGroupService::class)->vote($room, $question, $choice->id, $this->player);
            $this->assertFalse($result->isFailure(), $result->errorMessage ?? '');
            $this->travel(6)->seconds();
            $this->assertSame(0, Artisan::call('queue:work', ['connection' => 'database', '--stop-when-empty' => true, '--sleep' => 0, '--tries' => 1]));
            $this->assertSame(0, DB::table('failed_jobs')->count());
            $this->assertDatabaseHas('room_question_resolutions', ['room_id' => $room->id, 'question_id' => $question->id, 'choice_id' => $choice->id]);
        }
        $this->assertSame(0, $room->encounterGroups()->where('status', 'active')->count());
    }

    private function inspect(GameRoom $room, string $ref): void
    {
        $choice = Choice::whereHas('question.level.zone', fn ($q) => $q->where('case_id', $this->case->id))->where('text', $this->choiceText($ref))->firstOrFail();
        $result = app(LocationInspectionService::class)->inspect($room, $choice->id, $this->player);
        $this->assertFalse($result->isFailure(), $result->errorMessage ?? '');
    }

    private function choiceText(string $ref): string
    {
        foreach ($this->manifest['zones'] as $zone) foreach ($zone['levels'] as $level) foreach ($level['nodes'] as $node) foreach ($node['choices'] as $choice) {
            if ($choice['ref_id'] === $ref) return $choice['text'];
        }
        throw new \LogicException('Unknown authored choice '.$ref);
    }

    private function request(GameRoom $room, int $index): void
    {
        $request = $this->manifest['investigation_requests'][$index];
        $evidence = collect($this->manifest['evidences'])->whereIn('ref_id', $request['required_evidence_refs'])->pluck('title');
        $characters = collect($this->manifest['characters'])->whereIn('ref_id', $request['required_character_refs'])->pluck('name');
        $result = app(InvestigationRequestService::class)->processRequest($room,
            $this->case->evidences()->whereIn('title', $evidence)->pluck('id')->all(),
            $this->case->characters()->whereIn('name', $characters)->pluck('id')->all());
        $this->assertFalse($result->isFailure(), $result->errorMessage ?? '');
    }
}
