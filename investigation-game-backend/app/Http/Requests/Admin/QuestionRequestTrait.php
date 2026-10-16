<?php

namespace App\Http\Requests\Admin;

trait QuestionRequestTrait
{
    protected function questionRules(): array
    {
        return [
            'level_id' => ['required', 'exists:levels,id'],
            'text' => ['required', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'audio' => ['nullable', 'file', 'mimes:mp3,wav,ogg', 'max:10240'],
            'choices' => ['nullable', 'array'],
            'choices.*.id' => ['nullable', 'integer', 'exists:choices,id'],
            'choices.*.text' => ['required', 'string', 'max:255'],
            'choices.*.outcomes' => ['nullable', 'array'],
            'choices.*.requirements' => ['nullable', 'array'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
