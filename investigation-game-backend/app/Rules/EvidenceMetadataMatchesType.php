<?php

namespace App\Rules;

use App\Enums\EvidenceSurface;
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

    private const TERMINAL_BLOCK_TYPES = [
        'prompt_line', 'output_stream', 'status_banner', 'file_tree', 'spacer',
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

        $foreignKey = null;
        foreach (EvidenceSurface::cases() as $s) {
            if ($s !== $surface && $s->metadataKey() !== null) {
                $foreignKey = $s->metadataKey();
                break;
            }
        }

        if ($foreignKey && isset($metadata[$foreignKey])) {
            $fail("A {$evidenceType->value} evidence cannot carry metadata.{$foreignKey}.");

            return;
        }

        $key = $surface->metadataKey();

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

            $allowedBlocks = match ($surface) {
                EvidenceSurface::Paper => self::DOC_BLOCK_TYPES,
                EvidenceSurface::Terminal => self::TERMINAL_BLOCK_TYPES,
                default => [],
            };

            if (! is_array($doc['blocks'] ?? null) || empty($doc['blocks']) || ! array_is_list($doc['blocks'])) {
                $fail("A {$evidenceType->value} evidence needs at least one block.");

                return;
            }

            $this->validateBlocks($doc['blocks'], $allowedBlocks, $fail, "{$key}.blocks");
        }
    }

    private function validateBlocks(array $blocks, array $allowedBlocks, Closure $fail, string $path, int $depth = 0): void
    {
        if ($depth > 32) {
            $fail("{$path}: Blocks may not be nested more than 32 levels deep.");

            return;
        }

        foreach ($blocks as $i => $block) {
            $block = is_object($block) ? (array) $block : $block;
            $blockPath = "{$path}.{$i}";
            if (! is_array($block) || ! in_array($block['type'] ?? null, $allowedBlocks, true)) {
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
                'prompt_line' => [
                    'prompt' => ['present', 'string'], 'command' => ['present', 'string'],
                    'output' => ['present', 'array', 'list'], 'output.*' => ['string'],
                ],
                'output_stream' => ['lines' => ['present', 'array', 'list'], 'lines.*' => ['string']],
                'status_banner' => ['text' => ['present', 'string'], 'tone' => ['required', 'in:info,ok,warn,critical']],
                'file_tree' => [
                    'entries' => ['present', 'array', 'list'], 'entries.*' => ['array'],
                    'entries.*.path' => ['required', 'string'], 'entries.*.kind' => ['required', 'in:file,dir,symlink,deleted'],
                    'entries.*.size' => ['sometimes', 'string'], 'entries.*.mtime' => ['sometimes', 'string'],
                ],
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
                    $this->validateBlocks($props[$column], $allowedBlocks, $fail, "{$blockPath}.props.{$column}", $depth + 1);
                }
            }
        }
    }
}
