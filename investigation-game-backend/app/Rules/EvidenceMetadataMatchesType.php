<?php

namespace App\Rules;

use App\Enums\EvidenceSurface;
use App\Enums\EvidenceType;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

class EvidenceMetadataMatchesType implements ValidationRule, DataAwareRule
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
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $evidenceTypeStr = $this->explicitType ?? ($this->data['evidence_type'] ?? null);

        if (!$evidenceTypeStr) {
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
            if (json_last_error() !== JSON_ERROR_NONE || !is_object($decodedObject)) {
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

        if (!is_array($metadata)) {
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

            if (!is_array($doc) || $doc === []) {
                $fail("A {$evidenceType->value} evidence requires a {$key} envelope.");
                return;
            }

            $allowedBlocks = match ($surface) {
                EvidenceSurface::Paper => self::DOC_BLOCK_TYPES,
                EvidenceSurface::Terminal => self::TERMINAL_BLOCK_TYPES,
                default => [],
            };

            if (!is_array($doc['blocks'] ?? null) || empty($doc['blocks'])) {
                $fail("A {$evidenceType->value} evidence needs at least one block.");
                return;
            }

            foreach ($doc['blocks'] as $i => $b) {
                // Handle both array and object (stdClass) structures
                if (is_object($b)) {
                    $b = (array) $b;
                }

                if (!is_array($b) || !is_string($b['type'] ?? null)) {
                    $fail("Block #{$i} must be an object with a valid type.");
                    continue;
                }

                $blockType = $b['type'];

                if (!in_array($blockType, $allowedBlocks, true)) {
                    $fail("Block #{$i} type '{$blockType}' is not valid for a {$evidenceType->value} evidence.");
                }
            }
        }
    }
}
