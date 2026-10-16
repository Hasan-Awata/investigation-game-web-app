<?php

namespace App\Http\Requests\Admin;

use App\Enums\CharacterCharge;
use App\Enums\CharacterStatus;
use Illuminate\Validation\Rules\Enum;

trait CharacterRequestTrait
{
    protected function characterRules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'name' => ['required', 'string', 'max:255'],
            'background' => ['nullable', 'string'],
            'is_initial' => ['required', 'boolean'],
            'is_guilty' => ['required', 'boolean'],
            'charge' => ['nullable', new Enum(CharacterCharge::class)],
            'default_status' => ['required', new Enum(CharacterStatus::class)],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
