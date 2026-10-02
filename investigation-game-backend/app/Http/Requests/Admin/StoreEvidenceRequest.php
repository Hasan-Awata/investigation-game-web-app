<?php

namespace App\Http\Requests\Admin;

use App\Enums\EvidenceType;
use App\Rules\EvidenceMetadataMatchesType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreEvidenceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'metadata' => ['nullable', new EvidenceMetadataMatchesType],
            'is_initial' => ['required', 'boolean'],
            'is_vital_for_conviction' => ['required', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
            'audio' => ['nullable', 'file', 'mimes:mp3,wav,ogg', 'max:10240'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}