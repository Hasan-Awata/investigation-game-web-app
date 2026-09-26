<?php

namespace Tests\Feature\Evidence;

use App\Enums\AssetKind;
use App\Http\Resources\EvidenceBoardResource;
use App\Models\Evidence;
use App\Models\GameCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The board reads each evidence's thumbnail, so the assets relation has to be
 * eager loaded by every caller that builds a board. Missing it does not break
 * anything visibly, it just quietly adds a query per evidence to every room
 * load and every Reverb broadcast.
 */
class EvidenceBoardQueryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Counts the queries issued while a board is serialized.
     */
    private function countBoardQueries(int $evidenceCount): int
    {
        $case = GameCase::factory()->create();

        Evidence::factory()->count($evidenceCount)->create([
            'case_id' => $case->id,
            'is_initial' => true,
        ]);

        $possessed = Evidence::query()
            ->with('assets')
            ->where('case_id', $case->id)
            ->get();

        $count = 0;

        DB::listen(function () use (&$count): void {
            $count++;
        });

        EvidenceBoardResource::collection($possessed)->resolve($this->app->make(Request::class));

        return $count;
    }

    public function test_serializing_a_board_does_not_query_per_evidence(): void
    {
        $small = $this->countBoardQueries(3);
        $large = $this->countBoardQueries(12);

        $this->assertSame(
            $small,
            $large,
            "Board queries must not scale with evidence count (3 => {$small}, 12 => {$large}). "
            .'An evidence asset is being lazy loaded somewhere.'
        );
    }

    public function test_a_board_entry_exposes_only_its_image_as_a_thumbnail(): void
    {
        $case = GameCase::factory()->create();

        $evidence = Evidence::factory()->create([
            'case_id' => $case->id,
            'is_initial' => true,
        ]);

        $evidence->assets()->create([
            'kind' => AssetKind::Audio,
            'disk' => 'public',
            'path' => 'cases/'.$case->id.'/evidences/tape.mp3',
            'mime' => 'audio/mpeg',
            'bytes' => 10,
        ]);

        $payload = EvidenceBoardResource::collection(
            Evidence::query()->with('assets')->whereKey($evidence->id)->get()
        )->resolve($this->app->make(Request::class));

        $entry = $payload[0];

        $this->assertArrayNotHasKey('assets', $entry);
        $this->assertArrayNotHasKey('content_payload', $entry);
        $this->assertArrayHasKey('thumbnail_url', $entry);
        $this->assertNull($entry['thumbnail_url'], 'An audio asset must not become the thumbnail.');
    }
}
