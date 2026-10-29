<?php

namespace App\Http\Requests\Admin;

use App\Enums\EvidenceType;
use App\Rules\EvidenceMetadataMatchesType;
use App\Support\MediaValidationRules;
use Illuminate\Validation\Validator;
use Illuminate\Validation\Rules\Enum;
use Closure;

trait EvidenceRequestTrait
{
    protected function prepareForValidation(): void
    {
        $metadata = $this->input('metadata');
        if (!is_string($metadata)) {
            return;
        }

        $raw = trim($metadata);
        if ($raw === '') {
            $this->merge(['metadata' => null]);
            return;
        }

        $decodedObject = json_decode($raw);
        if (json_last_error() === JSON_ERROR_NONE && is_object($decodedObject)) {
            $this->merge(['metadata' => json_decode($raw, true)]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = $this->input('evidence_type');
            if (!is_string($type)) {
                $evidence = $this->route('evidence');
                $type = is_object($evidence) ? $evidence->evidence_type : null;
            }

            if ($this->hasFile('audio') && $type !== 'audio') {
                $validator->errors()->add('audio', 'Audio files can only be uploaded for audio evidence.');
            }

            if ($this->hasFile('image') && !in_array($type, ['image', 'testimony'], true)) {
                $validator->errors()->add('image', 'Direct image uploads are only supported for image, testimony, or physical evidence types.');
            }
        });
    }

    protected function evidenceRules(): array
    {
        $fallbackType = $this->input('evidence_type') ?? $this->route('evidence')?->evidence_type;
        if ($fallbackType instanceof EvidenceType) {
            $fallbackType = $fallbackType->value;
        }

        return [
            'case_id' => ['required', 'exists:cases,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'metadata' => [
                'nullable',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (!is_string($value)) {
                        return;
                    }

                    $raw = trim($value);
                    if ($raw === '') {
                        return;
                    }

                    $decoded = json_decode($raw);
                    if (json_last_error() !== JSON_ERROR_NONE || !is_object($decoded)) {
                        $fail('The metadata field must be a valid JSON object.');
                    }
                },
                new EvidenceMetadataMatchesType($fallbackType),
            ],
            'is_initial' => ['required', 'boolean'],
            'is_vital_for_conviction' => ['required', 'boolean'],
            'image' => ['nullable', ...MediaValidationRules::IMAGE],
            'audio' => ['nullable', ...MediaValidationRules::AUDIO],
            'img_url' => ['nullable', 'string', 'max:2048'],
            'audio_url' => ['nullable', 'string', 'max:2048'],
            'clear_img' => ['nullable', 'boolean'],
            'clear_audio' => ['nullable', 'boolean'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
