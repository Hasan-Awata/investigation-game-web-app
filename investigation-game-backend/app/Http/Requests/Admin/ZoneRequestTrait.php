<?php

namespace App\Http\Requests\Admin;

trait ZoneRequestTrait
{
    protected function zoneRules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => ['required', 'integer', 'min:1'],
            'coord_x' => ['nullable', 'numeric'],
            'coord_y' => ['nullable', 'numeric'],
        ];
    }
}
