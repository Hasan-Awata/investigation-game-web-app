<?php

namespace App\Http\Requests\Admin;

use App\Support\MediaValidationRules;

trait CaseRequestTrait
{
    protected function caseRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'story' => ['required', 'string'],
            'map_url' => ['prohibited'],
            'min_player_XP' => ['required', 'integer', 'min:0'],
            'XP_on_solve' => ['required', 'integer', 'min:0'],
            'max_strikes' => ['required', 'integer', 'min:1'],
            'rating_stars' => ['required', 'numeric', 'min:0', 'max:5'],
            'age_rating' => ['required', 'string', 'max:50'],
            'estimated_playtime' => ['required', 'string', 'max:100'],
            'difficulty' => ['required', 'string', 'max:50'],
            'tags' => ['nullable', 'string'],
            'author_name' => ['required', 'string', 'max:100'],
            'image' => ['nullable', ...MediaValidationRules::IMAGE],
            'is_published' => ['required', 'boolean'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
