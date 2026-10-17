<?php

namespace App\Rules;

use App\Enums\EvidenceSurface;
use App\Enums\EvidenceType;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class EvidenceMetadataMatchesType implements ValidationRule
{
    private const SURFACE_BLOCKS = [
        'paper' => [
            'letterhead', 'meta_grid', 'prose', 'two_column', 'table', 'list',
            'signature_row', 'stamp', 'barcode', 'watermark', 'rule', 'spacer',
            'image', 'annotation', 'redaction', 'diagram',
        ],
        'terminal' => [
            'prompt_line', 'output_stream', 'status_banner', 'file_tree', 'spacer',
        ],
    ];

    private array $customData = [];

    public function setData(array $data): void
    {
        $this->customData = $data;
    }

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $inputData = $this->customData ?: ($this->data ?? []);
        $evidenceTypeStr = $inputData['evidence_type'] ?? null;

        if (!$evidenceTypeStr) {
            return;
        }

        try {
            $evidenceType = EvidenceType::from($evidenceTypeStr);
        } catch (\ValueError) {
            return;
        }

        $surface = $evidenceType->surface();
        if (is_string($value)) {
            $decodedObject = json_decode($value);
            if (json_last_error() !== JSON_ERROR_NONE || !is_object($decodedObject)) {
                $fail('The metadata field must be a valid JSON object.');
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

            if (empty($doc['blocks'])) {
                $fail("A {$evidenceType->value} evidence needs at least one block.");
                return;
            }

            $allowedBlocks = self::SURFACE_BLOCKS[$surface->value] ?? [];

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
