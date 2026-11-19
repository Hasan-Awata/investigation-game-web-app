<?php

namespace App\Http\Requests\Admin;

use App\Enums\EvidenceType;
use App\Rules\EvidenceMetadataMatchesType;
use App\Support\EvidenceTemplateCatalog;
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
            $type = $type instanceof EvidenceType ? $type->value : $type;
            $paper = in_array($type, ['document', 'forensic'], true);
            $metadata = $this->input('metadata');
            $uploads = $this->file('template_images', []);
            $existing = $this->route('evidence');
            if (!$this->exists('metadata') && isset($existing->metadata['template']) &&
                ($type !== $existing->evidence_type->value || (int) $this->input('case_id') !== $existing->case_id)) {
                $validator->errors()->add('metadata.template', 'Include evidence metadata when moving a template record.');
            }
            if (is_array($metadata) && array_key_exists('template', $metadata)) {
                foreach (EvidenceTemplateCatalog::errors($metadata['template'], (string) $type, is_array($uploads) ? $uploads : []) as $path => $messages) {
                    foreach ($messages as $message) {
                        $validator->errors()->add($path, $message);
                    }
                }
                if (array_key_exists('doc', $metadata)) {
                    $validator->errors()->add('metadata.doc', 'A template record cannot also contain a block document.');
                }
            } else {
                if ($uploads) {
                    $validator->errors()->add('template_images', 'Select a template before attaching images.');
                }
                if ($paper && (($existing?->evidence_type?->value ?? null) !== $type
                    || ($this->exists('metadata') && (!isset($existing->metadata['doc']) || $metadata !== $existing->metadata)))) {
                    $validator->errors()->add('metadata.template', 'Select an evidence template for this document.');
                }
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
                ...(is_array($this->input('metadata')) && array_key_exists('template', $this->input('metadata'))
                    ? [] : [new EvidenceMetadataMatchesType($fallbackType)]),
            ],
            'is_initial' => ['required', 'boolean'],
            'is_vital_for_conviction' => ['required', 'boolean'],
            'image' => ['nullable', ...MediaValidationRules::IMAGE],
            'audio' => ['nullable', ...MediaValidationRules::AUDIO],
            'template_images' => ['sometimes', 'array', 'max:20'],
            'template_images.*' => ['required', ...MediaValidationRules::IMAGE],
            'img_url' => ['nullable', 'string', 'max:2048'],
            'audio_url' => ['nullable', 'string', 'max:2048'],
            'clear_img' => ['nullable', 'boolean'],
            'clear_audio' => ['nullable', 'boolean'],
            'store_locally' => ['required', 'boolean'],
        ];
    }
}
