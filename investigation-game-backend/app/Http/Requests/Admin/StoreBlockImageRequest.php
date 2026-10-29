<?php

namespace App\Http\Requests\Admin;

use App\Support\MediaValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreBlockImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'image' => ['required', ...MediaValidationRules::IMAGE],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
