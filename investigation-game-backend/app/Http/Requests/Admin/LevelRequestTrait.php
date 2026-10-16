<?php

namespace App\Http\Requests\Admin;

use App\Enums\LevelPresentationType;
use Illuminate\Validation\Rules\Enum;

trait LevelRequestTrait
{
    protected function levelRules(): array
    {
        return [
            'zone_id' => ['required', 'exists:zones,id'],
            'title' => ['required', 'string', 'max:255'],
            'details' => ['required', 'string'],
            'order_index' => ['required', 'integer', 'min:1'],
            'is_initial' => ['required', 'boolean'],
            'presentation_type' => ['required', new Enum(LevelPresentationType::class)],
            'required_request_id' => ['nullable', 'exists:investigation_requests,id'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
