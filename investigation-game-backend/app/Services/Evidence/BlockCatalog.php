<?php

namespace App\Services\Evidence;

use App\Enums\EvidenceBlockType;

/**
 * The single authority for the block prop schemas.
 *
 * Three consumers read from here so they can never drift:
 *   - ContentPayloadValidator, which turns these descriptors into 422 errors
 *   - GET /api/admin/evidence-schema, which hands them to the block editor
 *   - EvidenceFactory, which builds valid sample payloads from the defaults
 *
 * Every block is available to every evidence type. Presentation is the only
 * thing that varies per type, and that is expressed by the payload shape the
 * evidence's viewer strategy implies, not by the block catalog.
 *
 * Field descriptor keys:
 *   name      prop key on the block
 *   input     editor control the admin form should render
 *   label     human label for that control
 *   required  whether the prop must be present and non-empty
 *   default   value used when the admin form creates the block
 *   options   allowed values, for input = select
 *   min/max   inclusive bounds, for input = number
 *   max_bytes byte ceiling, for the free-text inputs
 *   sanitize  sanitizer key applied before the value is persisted
 */
class BlockCatalog
{
    public const SANITIZE_TEXT = 'text';

    public const SANITIZE_ARTIFACT_HTML = 'artifact_html';

    /**
     * @return array<string, array{type: string, label: string, fields: list<array<string, mixed>>}>
     */
    public function all(): array
    {
        return [
            EvidenceBlockType::Text->value => $this->textDefinition(),
            EvidenceBlockType::Table->value => $this->tableDefinition(),
            EvidenceBlockType::Signature->value => $this->signatureDefinition(),
            EvidenceBlockType::Stamp->value => $this->stampDefinition(),
        ];
    }

    /**
     * @return array{type: string, label: string, fields: list<array<string, mixed>>}
     */
    public function definition(EvidenceBlockType $type): array
    {
        return $this->all()[$type->value];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fields(EvidenceBlockType $type): array
    {
        return $this->definition($type)['fields'];
    }

    /**
     * @return array<string, mixed>
     */
    public function defaults(EvidenceBlockType $type): array
    {
        $defaults = [];

        foreach ($this->fields($type) as $field) {
            $defaults[$field['name']] = $field['default'] ?? $this->neutralDefaultFor($field['input']);
        }

        return $defaults;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function field(EvidenceBlockType $type, string $name): ?array
    {
        foreach ($this->fields($type) as $field) {
            if ($field['name'] === $name) {
                return $field;
            }
        }

        return null;
    }

    /**
     * JSON-serializable payload for the admin block editor.
     *
     * @return list<array<string, mixed>>
     */
    public function schema(): array
    {
        return array_values($this->all());
    }

    /**
     * @return array{type: string, label: string, fields: list<array<string, mixed>>}
     */
    private function textDefinition(): array
    {
        return [
            'type' => EvidenceBlockType::Text->value,
            'label' => 'Prose',
            'fields' => [
                [
                    'name' => 'html',
                    'input' => 'rich_text',
                    'label' => 'Content',
                    'required' => true,
                    'default' => '<p>Enter text.</p>',
                    'max_bytes' => (int) config('evidence.limits.max_text_html_bytes'),
                    'sanitize' => self::SANITIZE_TEXT,
                ],
                [
                    'name' => 'align',
                    'input' => 'select',
                    'label' => 'Alignment',
                    'required' => true,
                    'default' => 'left',
                    'options' => ['left', 'center', 'right', 'justify'],
                ],
                [
                    'name' => 'size',
                    'input' => 'select',
                    'label' => 'Scale',
                    'required' => true,
                    'default' => 'body',
                    'options' => ['small', 'body', 'lead', 'heading'],
                ],
            ],
        ];
    }

    /**
     * @return array{type: string, label: string, fields: list<array<string, mixed>>}
     */
    private function tableDefinition(): array
    {
        return [
            'type' => EvidenceBlockType::Table->value,
            'label' => 'Table',
            'fields' => [
                [
                    'name' => 'headers',
                    'input' => 'string_row',
                    'label' => 'Columns',
                    'required' => true,
                    'default' => [],
                ],
                [
                    'name' => 'rows',
                    'input' => 'string_grid',
                    'label' => 'Rows',
                    'required' => true,
                    'default' => [],
                ],
                [
                    'name' => 'caption',
                    'input' => 'text',
                    'label' => 'Caption',
                    'required' => false,
                    'default' => '',
                ],
                [
                    'name' => 'dense',
                    'input' => 'toggle',
                    'label' => 'Compact rows',
                    'required' => true,
                    'default' => false,
                ],
            ],
        ];
    }

    /**
     * @return array{type: string, label: string, fields: list<array<string, mixed>>}
     */
    private function signatureDefinition(): array
    {
        return [
            'type' => EvidenceBlockType::Signature->value,
            'label' => 'Signature',
            'fields' => [
                [
                    'name' => 'signature_id',
                    'input' => 'signature',
                    'label' => 'Signature',
                    'required' => true,
                    'default' => null,
                    'min' => 1,
                ],
                [
                    'name' => 'label',
                    'input' => 'text',
                    'label' => 'Caption',
                    'required' => false,
                    'default' => '',
                ],
                [
                    'name' => 'verified',
                    'input' => 'toggle',
                    'label' => 'Mark as verified',
                    'required' => true,
                    'default' => false,
                ],
            ],
        ];
    }

    /**
     * @return array{type: string, label: string, fields: list<array<string, mixed>>}
     */
    private function stampDefinition(): array
    {
        return [
            'type' => EvidenceBlockType::Stamp->value,
            'label' => 'Stamp',
            'fields' => [
                [
                    'name' => 'text',
                    'input' => 'textarea',
                    'label' => 'Text',
                    'required' => true,
                    'default' => 'CONFIDENTIAL',
                    'max_bytes' => 512,
                ],
                [
                    'name' => 'variant',
                    'input' => 'select',
                    'label' => 'Ink',
                    'required' => true,
                    'default' => 'red',
                    'options' => ['red', 'blue', 'black'],
                ],
                [
                    'name' => 'rotation',
                    'input' => 'number',
                    'label' => 'Rotation',
                    'required' => true,
                    'default' => -8,
                    'min' => -45,
                    'max' => 45,
                ],
                [
                    'name' => 'font_size',
                    'input' => 'select',
                    'label' => 'Scale',
                    'required' => true,
                    'default' => 'auto',
                    'options' => ['auto', 'small', 'medium', 'large'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function neutralDefaultFor(string $input): mixed
    {
        return match ($input) {
            'rich_text', 'textarea', 'text' => '',
            'toggle' => false,
            'number' => 0,
            'signature' => null,
            'string_row', 'string_grid' => [],
            default => null,
        };
    }
}
