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

class AdminQuestionUpdateTest extends TestCase
{
    use ActsAsAdmin;
    use RefreshDatabase;

    private Level $level;

    private Question $question;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsAdmin();

        $case = GameCase::create([
            'title' => 'Question Case',
            'story' => 'Story',
            'XP_on_solve' => 100,
        ]);

        $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);

        $this->level = Level::create([
            'zone_id' => $zone->id,
            'title' => 'Level',
            'details' => 'Details',
            'order_index' => 1,
            'is_initial' => true,
            'presentation_type' => 'interrogation',
        ]);

        $this->question = Question::create([
            'level_id' => $this->level->id,
            'text' => 'Initial question?',
        ]);
    }

    public function test_editing_a_question_preserves_choice_ids_and_their_requirement_references(): void
    {
        $choiceA = Choice::create(['question_id' => $this->question->id, 'text' => 'Choice A']);
        $choiceB = Choice::create([
            'question_id' => $this->question->id,
            'text' => 'Choice B',
            'requirements' => ['required_choices' => [$choiceA->id]],
        ]);
        $choiceRemoved = Choice::create(['question_id' => $this->question->id, 'text' => 'Remove me']);

        $this->putJson("/api/admin/questions/{$this->question->id}", [
            'level_id' => $this->level->id,
            'text' => 'Updated question?',
            'store_locally' => false,
            'choices' => [
                ['id' => $choiceA->id, 'text' => 'Choice A (edited)'],
                ['id' => $choiceB->id, 'text' => 'Choice B', 'requirements' => ['required_choices' => [$choiceA->id]]],
                ['text' => 'Brand new choice'],
            ],
        ])->assertOk();

        // Existing ids are preserved and updated in place.
        $this->assertDatabaseHas('choices', ['id' => $choiceA->id, 'text' => 'Choice A (edited)']);
        $this->assertDatabaseHas('choices', ['id' => $choiceB->id, 'text' => 'Choice B']);

        // Removed choices are deleted; new choices are created.
        $this->assertDatabaseMissing('choices', ['id' => $choiceRemoved->id]);
        $this->assertSame(3, Choice::where('question_id', $this->question->id)->count());

        // The requirement still points at the same, stable choice id.
        $this->assertSame(
            [$choiceA->id],
            $choiceB->fresh()->requirements['required_choices']
        );
    }

    public function test_creating_a_question_persists_its_choices(): void
    {
        $response = $this->postJson('/api/admin/questions', [
            'level_id' => $this->level->id,
            'text' => 'New node',
            'store_locally' => false,
            'choices' => [
                ['text' => 'Yes'],
                ['text' => 'No', 'outcomes' => ['feedback' => 'Denied', 'gives_strike' => true]],
            ],
        ])->assertStatus(201);

        $questionId = $response->json('question.id');

        $this->assertSame(2, Choice::where('question_id', $questionId)->count());
        $this->assertDatabaseHas('choices', ['question_id' => $questionId, 'text' => 'Yes']);

        $no = Choice::where('question_id', $questionId)->where('text', 'No')->firstOrFail();
        $this->assertSame('Denied', $no->outcomes['feedback']);
        $this->assertTrue($no->outcomes['gives_strike']);
    }
}
