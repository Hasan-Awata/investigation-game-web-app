<?php

namespace App\Rules;

use App\Enums\EvidenceType;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Translation\PotentiallyTranslatedString;

class EvidenceMetadataMatchesType implements DataAwareRule, ValidationRule
{
    private const DOC_BLOCK_TYPES = [
        'letterhead', 'meta_grid', 'prose', 'two_column', 'table', 'list',
        'signature_row', 'stamp', 'barcode', 'watermark', 'rule', 'spacer',
        'image', 'annotation', 'redaction', 'diagram',
    ];

    /** @var array<string, mixed> */
    protected array $data = [];

    public function __construct(protected ?string $explicitType = null) {}

    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $evidenceTypeStr = $this->explicitType ?? ($this->data['evidence_type'] ?? null);

        if (! $evidenceTypeStr) {
            $fail('The evidence_type is required to validate metadata.');

            return;
        }

        try {
            $evidenceType = EvidenceType::from($evidenceTypeStr);
        } catch (\ValueError) {
            $fail('The evidence_type is required to validate metadata.');

            return;
        }

        $surface = $evidenceType->surface();
        if (is_string($value)) {
            $decodedObject = json_decode($value);
            if (json_last_error() !== JSON_ERROR_NONE || ! is_object($decodedObject)) {
                $fail('The metadata must be a valid JSON object.');

                return;
            }

            $metadata = json_decode($value, true);
        } else {
            $metadata = $value;
        }

        // Handle both array and object (stdClass) structures
        if (is_object($metadata)) {
            $metadata = (array) $metadata;
        }

        if (! is_array($metadata)) {
            $fail('The metadata field must be a valid JSON object.');

            return;
        }

        $key = $surface->metadataKey();
        if ($key === null && isset($metadata['doc'])) {
            $fail("A {$evidenceType->value} evidence cannot carry metadata.doc.");

            return;
        }

        if ($key !== null) {
            $doc = $metadata[$key] ?? null;

            // Handle both array and object (stdClass) structures
            if (is_object($doc)) {
                $doc = (array) $doc;
            }

            if (! is_array($doc) || $doc === []) {
                $fail("A {$evidenceType->value} evidence requires a {$key} envelope.");

                return;
            }

            if (! is_array($doc['blocks'] ?? null) || empty($doc['blocks']) || ! array_is_list($doc['blocks'])) {
                $fail("A {$evidenceType->value} evidence needs at least one block.");

                return;
            }

            $this->validateBlocks($doc['blocks'], $fail, "{$key}.blocks");
        }
    }

    private function validateBlocks(array $blocks, Closure $fail, string $path, int $depth = 0): void
    {
        if ($depth > 32) {
            $fail("{$path}: Blocks may not be nested more than 32 levels deep.");

            return;
        }

        foreach ($blocks as $i => $block) {
            $block = is_object($block) ? (array) $block : $block;
            $blockPath = "{$path}.{$i}";
            if (! is_array($block) || ! in_array($block['type'] ?? null, self::DOC_BLOCK_TYPES, true)) {
                $fail("{$blockPath}: Block must have a supported type.");

                continue;
            }

            $rules = match ($block['type']) {
                'prose' => ['html' => ['present', 'string']],
                'image' => ['url' => ['required', 'string']],
                'two_column' => ['left' => ['present', 'array', 'list'], 'right' => ['present', 'array', 'list']],
                'meta_grid' => [
                    'rows' => ['present', 'array', 'list'], 'rows.*' => ['array'],
                    'rows.*.label' => ['present', 'string'], 'rows.*.value' => ['present', 'string'],
                ],
                'table' => [
                    'columns' => ['present', 'array', 'list'], 'columns.*' => ['array'],
                    'columns.*.key' => ['required', 'string'], 'columns.*.label' => ['present', 'string'],
                    'rows' => ['present', 'array', 'list'], 'rows.*' => ['array'],
                ],
                'list' => ['items' => ['present', 'array', 'list'], 'items.*' => ['string']],
                'signature_row' => [
                    'columns' => ['present', 'array', 'list'], 'columns.*' => ['array'],
                    'columns.*.caption' => ['present', 'string'],
                ],
                'stamp', 'watermark', 'annotation' => ['text' => ['present', 'string']],
                'barcode' => ['value' => ['present', 'string']],
                'diagram' => ['preset' => ['required', 'in:body_outline,fingerprint,electropherogram,mass_spec']],
                'spacer' => ['height' => ['required', 'numeric', 'min:0']],
                'letterhead' => array_fill_keys(['agency', 'title', 'sub', 'aside', 'asideLabel'], ['sometimes', 'string']),
                'redaction' => ['lines' => ['sometimes', 'integer', 'min:0'], 'label' => ['sometimes', 'string']],
                'rule' => ['variant' => ['sometimes', 'in:solid,dashed,dotted,double']],
            };

            $props = $block['props'] ?? null;
            $props = is_object($props) ? (array) $props : $props;
            $validator = Validator::make(['props' => $props], ['props' => ['present', 'array']]);
            if ($validator->fails() || ($props !== [] && array_is_list($props))) {
                $fail("{$blockPath}.props: Block props must be an object.");

                continue;
            }

            $validator = Validator::make($props, $rules);
            foreach ($validator->errors()->toArray() as $field => $messages) {
                foreach ($messages as $message) {
                    $fail("{$blockPath}.props.{$field}: {$message}");
                }
            }

            if ($block['type'] === 'two_column' && ! $validator->fails()) {
                foreach (['left', 'right'] as $column) {
                    $this->validateBlocks($props[$column], $fail, "{$blockPath}.props.{$column}", $depth + 1);
                }
            }
        }
    }
}
