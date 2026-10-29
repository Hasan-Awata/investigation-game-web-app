<?php

namespace App\Http\Requests\Admin;

use App\Enums\LevelPresentationType;
use App\Support\MediaValidationRules;
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
            'image' => ['nullable', ...MediaValidationRules::IMAGE],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
