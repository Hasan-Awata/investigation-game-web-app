<?php

namespace Tests\Feature;

use App\Models\GameCase;
use App\Models\Level;
use App\Models\Question;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class QuestionOrderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_questions_are_ordered_by_order_index_then_id_and_dead_columns_are_absent(): void
    {
        $case = GameCase::create(['title' => 'Ordering Case', 'story' => 'Story', 'XP_on_solve' => 10]);
        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
        $level = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Interview',
            'details' => 'Details',
            'order_index' => 1,
            'is_initial' => true,
        ]);

        $later = $level->questions()->create(['order_index' => 2, 'text' => 'Later']);
        $first = $level->questions()->create(['order_index' => 0, 'text' => 'First']);

        $this->assertSame([$first->id, $later->id], $level->questions()->pluck('id')->all());
        $this->assertTrue(Schema::hasColumn('questions', 'order_index'));
        $this->assertFalse(Schema::hasColumn('evidences', 'sub_type'));
        $this->assertContains('order_index', (new Question())->getFillable());
        $this->assertNotContains('msg_when_wrong', (new Question())->getFillable());
        $this->assertSame('integer', (new Question())->getCasts()['order_index']);
    }
}
