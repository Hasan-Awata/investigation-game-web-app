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
            'prompt_line', 'output_stream', 'status_banner', 'encryption_flow',
            'hash_matrix', 'file_tree', 'ascii_panel', 'packet_trace', 'spacer',
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
        $metadata = is_string($value) ? json_decode($value, true) : $value;

        // Handle both array and object (stdClass) structures
        if (is_object($metadata)) {
            $metadata = (array) $metadata;
        }

        if (json_last_error() !== JSON_ERROR_NONE) {
            $fail('Metadata is not valid JSON.');
            return;
        }

        if (!is_array($metadata)) {
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
            }

            if (empty($doc['blocks'])) {
                $fail("A {$evidenceType->value} evidence needs at least one block.");
            }

            $allowedBlocks = self::SURFACE_BLOCKS[$surface->value] ?? [];

            foreach ($doc['blocks'] as $i => $b) {
                // Handle both array and object (stdClass) structures
                if (is_object($b)) {
                    $b = (array) $b;
                }
                $blockType = $b['type'] ?? null;

                if (!in_array($blockType, $allowedBlocks, true)) {
                    $fail("Block #{$i} type '{$blockType}' is not valid for a {$evidenceType->value} evidence.");
                }
            }
        }
    }
}