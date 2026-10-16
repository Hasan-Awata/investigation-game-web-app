<?php

namespace Tests\Feature\Admin;

use App\Models\Choice;
use App\Models\GameCase;
use App\Models\Level;
use App\Models\Question;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Admin\Concerns\ActsAsAdmin;
use Tests\TestCase;

class AdminIndexTest extends TestCase
{
    use ActsAsAdmin;
    use RefreshDatabase;

    public function test_index_includes_the_full_zone_level_question_choice_graph(): void
    {
        $this->actingAsAdmin();

        $case = GameCase::create([
            'title' => 'Graph Case',
            'story' => 'Story',
            'XP_on_solve' => 100,
        ]);

        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Precinct', 'order_index' => 1]);

        $level = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Interview',
            'details' => 'Details',
            'order_index' => 1,
            'is_initial' => true,
            'presentation_type' => 'interrogation',
        ]);

        $question = Question::create(['level_id' => $level->id, 'text' => 'Where were you?']);
        Choice::create(['question_id' => $question->id, 'text' => 'Press the alibi']);

        $response = $this->getJson('/api/admin/cases')->assertOk();

        $response->assertJsonPath('cases.0.zones.0.levels.0.questions.0.choices.0.text', 'Press the alibi');
        $response->assertJsonCount(1, 'cases.0.zones.0.levels.0.questions.0.choices');
    }
}
