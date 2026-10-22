<?php

namespace App\Http\Requests\Admin;

trait QuestionRequestTrait
{
    public function withValidator(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        $validator->after(function ($validator): void {
            $level = \App\Models\Level::query()->with('zone')->find($this->input('level_id'));
            if (!$level?->zone) return;
            foreach ($this->input('choices', []) as $choiceIndex => $choice) {
                if (!is_array($choice) || !is_array($choice['outcomes'] ?? null)) continue;
                foreach ($choice['outcomes']['unlock_location_points'] ?? [] as $targetIndex => $targetId) {
                    $target = \App\Models\Choice::query()->with('question.level.zone')->find($targetId);
                    $targetLevel = $target?->question?->level;
                    $isCoordinateChoice = $target && preg_match('/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\|.+$/u', $target->text) === 1;
                    if (!$target || !$targetLevel || $targetLevel->presentation_type !== \App\Enums\LevelPresentationType::Location
                        || (int) $targetLevel->zone?->case_id !== (int) $level->zone->case_id || !$isCoordinateChoice) {
                        $validator->errors()->add("choices.{$choiceIndex}.outcomes.unlock_location_points.{$targetIndex}", 'Choose a coordinate point from a location level in this case.');
                    }
                }
            }
        });
    }

    protected function questionRules(): array
    {
        return [
            'level_id' => ['required', 'exists:levels,id'],
            'order_index' => ['nullable', 'integer', 'min:0'],
            'text' => ['required', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'choices' => ['nullable', 'array'],
            'choices.*.id' => ['nullable', 'integer', 'exists:choices,id'],
            'choices.*.text' => ['required', 'string', 'max:255'],
            'choices.*.outcomes' => ['nullable', 'array'],
            'choices.*.outcomes.unlock_location_points' => ['nullable', 'array'],
            'choices.*.outcomes.unlock_location_points.*' => ['integer', 'exists:choices,id'],
            'choices.*.requirements' => ['nullable', 'array'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
