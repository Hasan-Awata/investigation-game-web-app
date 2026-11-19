<?php

namespace App\Http\Requests\Admin;

use App\Enums\EvidenceType;
use App\Support\EvidenceTemplateCatalog;
use App\Support\MediaValidationRules;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

trait EvidenceRequestTrait
{
    protected function prepareForValidation(): void
    {
        $metadata = $this->input('metadata');
        if (! is_string($metadata)) {
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
            $existing = $this->route('evidence');
            $inputType = $this->input('evidence_type');
            $type = is_string($inputType) ? EvidenceType::tryFrom($inputType) : $existing?->evidence_type;
            $uploads = $this->file('template_images', []);
            $metadataProvided = $this->exists('metadata');
            $sameRecordScope = $existing && $type === $existing->evidence_type && (int) $this->input('case_id') === $existing->case_id;
            $storedMetadata = $existing?->metadata ?? [];
            $metadata = $metadataProvided ? $this->input('metadata') : ($sameRecordScope ? $storedMetadata : null);
            $hasTemplate = is_array($metadata) && array_key_exists('template', $metadata);

            if (! $metadataProvided && ! $sameRecordScope && (array_key_exists('template', $storedMetadata) || array_key_exists('doc', $storedMetadata))) {
                $validator->errors()->add('metadata.template', 'Include evidence metadata when changing the case or type of a paper record.');
            } elseif ($hasTemplate || $type?->isPaper()) {
                foreach (EvidenceTemplateCatalog::errors($hasTemplate ? $metadata['template'] : null, $type?->value ?? '', is_array($uploads) ? $uploads : []) as $path => $messages) {
                    foreach ($messages as $message) {
                        $validator->errors()->add($path, $message);
                    }
                }
            }
            if (is_array($metadata) && array_key_exists('doc', $metadata)) {
                $validator->errors()->add('metadata.doc', 'Convert the legacy document to a template before saving.');
            }
            if ($uploads && (! $metadataProvided || ! $hasTemplate)) {
                $validator->errors()->add('template_images', 'Include template metadata when attaching images.');
            }

            if ($this->hasFile('audio') && $type !== EvidenceType::Audio) {
                $validator->errors()->add('audio', 'Audio files can only be uploaded for audio evidence.');
            }

            if ($this->hasFile('image') && ! in_array($type, [EvidenceType::Image, EvidenceType::Testimony], true)) {
                $validator->errors()->add('image', 'Direct image uploads are only supported for image and testimony evidence types.');
            }
        });
    }

    protected function evidenceRules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'evidence_type' => ['required', new Enum(EvidenceType::class)],
            'metadata' => ['nullable', 'array'],
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
