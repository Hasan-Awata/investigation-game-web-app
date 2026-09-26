<?php

namespace App\Services\Evidence;

use App\Enums\EvidenceBlockType;
use App\Enums\EvidenceType;
use App\Enums\ViewerStrategy;
use App\Exceptions\UnsafeArtifactStylesheetException;
use Illuminate\Validation\ValidationException;

/**
 * Validates and normalizes `content_payload` for the evidence's viewer strategy.
 *
 * Errors are reported as a Laravel validation bag keyed by dotted path, so the
 * admin form can highlight the offending control directly:
 *
 *   content_payload.pages.0.blocks.2.props.rows.1.3
 *
 * Validation is strict in both directions. Unknown block types, unknown props
 * and malformed nesting are rejected rather than dropped, because a payload that
 * survives half-understood will render as a blank gap in the evidence and give
 * the player no way to tell that something was lost.
 */
class ContentPayloadValidator
{
    public function __construct(
        private readonly BlockCatalog $catalog,
        private readonly ViewerStrategyLegality $legality,
        private readonly TextBlockSanitizer $textSanitizer,
        private readonly ArtifactSanitizer $artifactSanitizer,
        private readonly SignatureCatalog $signatures,
    ) {}

    /**
     * @return array<string, mixed>|null Null for a strategy that carries no payload.
     *
     * @throws ValidationException
     */
    public function validate(EvidenceType $type, ViewerStrategy $strategy, mixed $payload): ?array
    {
        $errors = [];

        $normalized = match (true) {
            $this->legality->requiresPages($strategy) => $this->validatePaged($payload, $errors),
            $strategy === ViewerStrategy::Artifact => $this->validateArtifact($payload, $errors),
            default => $this->validateMedia($payload, $errors),
        };

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $normalized;
    }

    /**
     * Paper and terminal share one shape: an explicit list of pages, each with
     * an explicit list of blocks. Page breaks are authored, never inferred, so
     * the same content always paginates identically for every player.
     *
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function validatePaged(mixed $payload, array &$errors): array
    {
        if (! $this->looksLikeObject($payload)) {
            $errors['content_payload'] = 'The content payload must be an object.';

            return [];
        }

        $this->rejectUnknownKeys($payload, ['pages'], 'content_payload', $errors);

        $pages = $payload['pages'] ?? null;
        $maxPages = (int) config('evidence.limits.max_pages');

        if (! is_array($pages) || ! array_is_list($pages)) {
            $errors['content_payload.pages'] = 'The pages property must be an array.';

            return [];
        }

        if ($pages === []) {
            $errors['content_payload.pages'] = 'At least one page is required.';

            return [];
        }

        if (count($pages) > $maxPages) {
            $errors['content_payload.pages'] = "An evidence may not exceed {$maxPages} pages.";
        }

        $seenIds = [];
        $normalizedPages = [];

        foreach ($pages as $pageIndex => $page) {
            $path = "content_payload.pages.{$pageIndex}";
            $normalizedPages[] = $this->validatePage($page, $pageIndex, $path, $seenIds, $errors);
        }

        return ['pages' => $normalizedPages];
    }

    /**
     * @param  array<string, string>  $errors
     * @param  array<string, true>  $seenIds
     * @return array<string, mixed>
     */
    private function validatePage(mixed $page, int $pageIndex, string $path, array &$seenIds, array &$errors): array
    {
        if (! $this->looksLikeObject($page)) {
            $errors[$path] = 'A page must be an object.';

            return ['id' => "page-{$pageIndex}", 'blocks' => []];
        }

        $this->rejectUnknownKeys($page, ['id', 'blocks'], $path, $errors);

        $id = $page['id'] ?? null;
        $idError = $this->checkId($id, "{$path}.id", $seenIds);

        if ($idError !== null) {
            $errors["{$path}.id"] = $idError;
            $id = "page-{$pageIndex}";
        }

        $blocks = $page['blocks'] ?? null;
        $maxBlocks = (int) config('evidence.limits.max_blocks_per_page');

        if (! is_array($blocks) || ! array_is_list($blocks)) {
            $errors["{$path}.blocks"] = 'The blocks property must be an array.';

            return ['id' => $id, 'blocks' => []];
        }

        if (count($blocks) > $maxBlocks) {
            $errors["{$path}.blocks"] = "A page may not exceed {$maxBlocks} blocks.";
        }

        $normalizedBlocks = [];

        foreach ($blocks as $blockIndex => $block) {
            $normalizedBlocks[] = $this->validateBlock(
                $block,
                "{$path}.blocks.{$blockIndex}",
                $seenIds,
                $errors
            );
        }

        return ['id' => $id, 'blocks' => $normalizedBlocks];
    }

    /**
     * @param  array<string, string>  $errors
     * @param  array<string, true>  $seenIds
     * @return array<string, mixed>
     */
    private function validateBlock(mixed $block, string $path, array &$seenIds, array &$errors): array
    {
        if (! $this->looksLikeObject($block)) {
            $errors[$path] = 'A block must be an object.';

            return ['id' => 'block', 'type' => EvidenceBlockType::Text->value, 'props' => []];
        }

        $this->rejectUnknownKeys($block, ['id', 'type', 'props'], $path, $errors);

        $id = $block['id'] ?? null;
        $idError = $this->checkId($id, "{$path}.id", $seenIds);

        if ($idError !== null) {
            $errors["{$path}.id"] = $idError;
            $id = 'block';
        }

        $rawType = $block['type'] ?? null;
        $type = is_string($rawType) ? EvidenceBlockType::tryFrom($rawType) : null;

        if (! $type instanceof EvidenceBlockType) {
            $errors["{$path}.type"] = sprintf(
                'Unknown block type [%s]; expected one of: %s.',
                is_string($rawType) ? $rawType : get_debug_type($rawType),
                implode(', ', array_column(EvidenceBlockType::cases(), 'value'))
            );

            return ['id' => $id, 'type' => EvidenceBlockType::Text->value, 'props' => []];
        }

        $rawProps = $block['props'] ?? null;

        if (! $this->looksLikeObject($rawProps)) {
            $errors["{$path}.props"] = 'The props property must be an object.';
            $rawProps = [];
        }

        $props = [];

        foreach ($this->catalog->fields($type) as $field) {
            $props[$field['name']] = $this->validateProp(
                $type,
                $field,
                $rawProps,
                "{$path}.props",
                $errors
            );
        }

        $allowed = array_column($this->catalog->fields($type), 'name');
        $this->rejectUnknownKeys($rawProps, $allowed, "{$path}.props", $errors);

        return ['id' => $id, 'type' => $type->value, 'props' => $props];
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $rawProps
     * @param  array<string, string>  $errors
     */
    private function validateProp(
        EvidenceBlockType $type,
        array $field,
        array $rawProps,
        string $propsPath,
        array &$errors,
    ): mixed {
        $name = $field['name'];
        $path = "{$propsPath}.{$name}";
        $value = $rawProps[$name] ?? null;

        return match ($field['input']) {
            'rich_text' => $this->validateRichText($field, $value, $path, $errors),
            'text', 'textarea' => $this->validateText($field, $value, $path, $errors),
            'select' => $this->validateSelect($field, $value, $path, $errors),
            'toggle' => $this->validateToggle($field, $value, $path, $errors),
            'number' => $this->validateNumber($field, $value, $path, $errors),
            'signature' => $this->validateSignature($field, $value, $path, $errors),
            'string_row' => $this->validateStringRow($value, $path, $errors),
            'string_grid' => $this->validateStringGrid($rawProps, $value, $path, $errors),
            default => $this->validateText($field, $value, $path, $errors),
        };
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, string>  $errors
     */
    private function validateRichText(array $field, mixed $value, string $path, array &$errors): string
    {
        if (! is_string($value) || trim($value) === '') {
            $errors[$path] = 'The '.$field['label'].' field is required.';

            return '';
        }

        $maxBytes = (int) ($field['max_bytes'] ?? 0);

        if ($maxBytes > 0 && strlen($value) > $maxBytes) {
            $errors[$path] = "The {$field['label']} field may not exceed {$maxBytes} bytes.";

            return '';
        }

        $clean = $this->textSanitizer->sanitize($value);

        if ($clean === '') {
            $errors[$path] = 'The '.$field['label'].' field had no permitted content remaining.';
        }

        return $clean;
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, string>  $errors
     */
    private function validateText(array $field, mixed $value, string $path, array &$errors): string
    {
        if ($value === null && ! ($field['required'] ?? false)) {
            return '';
        }

        if (! is_string($value)) {
            $errors[$path] = 'The '.$field['label'].' field must be a string.';

            return '';
        }

        if (($field['required'] ?? false) && trim($value) === '') {
            $errors[$path] = 'The '.$field['label'].' field is required.';

            return '';
        }

        $maxBytes = (int) ($field['max_bytes'] ?? 0);

        if ($maxBytes > 0 && strlen($value) > $maxBytes) {
            $errors[$path] = "The {$field['label']} field may not exceed {$maxBytes} bytes.";
        }

        return $value;
    }

    /**
     * An absent select falls back to the catalog default rather than failing.
     * "Required" here means the prop must resolve to one of the options, and
     * the default is by construction one of them. The only prop with no usable
     * default is a signature, and that one is checked separately.
     *
     * @param  array<string, mixed>  $field
     * @param  array<string, string>  $errors
     */
    private function validateSelect(array $field, mixed $value, string $path, array &$errors): string
    {
        $options = $field['options'] ?? [];
        $fallback = (string) ($field['default'] ?? '');

        if ($value === null) {
            return $fallback;
        }

        if (! is_string($value) || ! in_array($value, $options, true)) {
            $errors[$path] = sprintf(
                'The %s field must be one of: %s.',
                $field['label'],
                implode(', ', $options)
            );

            return $fallback;
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, string>  $errors
     */
    private function validateToggle(array $field, mixed $value, string $path, array &$errors): bool
    {
        if ($value === null) {
            return (bool) ($field['default'] ?? false);
        }

        if (! is_bool($value)) {
            $errors[$path] = 'The '.$field['label'].' field must be true or false.';

            return (bool) ($field['default'] ?? false);
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, string>  $errors
     */
    private function validateNumber(array $field, mixed $value, string $path, array &$errors): int|float
    {
        $default = $field['default'] ?? 0;

        if ($value === null) {
            return $default;
        }

        if (! is_int($value) && ! is_float($value)) {
            $errors[$path] = 'The '.$field['label'].' field must be a number.';

            return $default;
        }

        $min = $field['min'] ?? null;
        $max = $field['max'] ?? null;

        if (is_numeric($min) && $value < $min) {
            $errors[$path] = "The {$field['label']} field may not be below {$min}.";
        }

        if (is_numeric($max) && $value > $max) {
            $errors[$path] = "The {$field['label']} field may not exceed {$max}.";
        }

        return is_float($value) && $value === floor($value) ? (int) $value : $value;
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, string>  $errors
     */
    private function validateSignature(array $field, mixed $value, string $path, array &$errors): int
    {
        $default = (int) ($field['default'] ?? 0);

        if ($value === null) {
            $errors[$path] = 'The '.$field['label'].' field is required.';

            return $default;
        }

        if (! is_int($value) && ! (is_string($value) && ctype_digit($value))) {
            $errors[$path] = 'The '.$field['label'].' field must be a signature id.';

            return $default;
        }

        $id = (int) $value;
        $min = (int) ($field['min'] ?? 1);

        if ($id < $min) {
            $errors[$path] = "The {$field['label']} field may not be below {$min}.";

            return $default;
        }

        if (! $this->signatures->exists($id)) {
            $errors[$path] = "Signature [{$id}] does not exist.";
        }

        return $id;
    }

    /**
     * @param  array<string, string>  $errors
     * @return list<string>
     */
    private function validateStringRow(mixed $value, string $path, array &$errors): array
    {
        $maxColumns = (int) config('evidence.limits.max_table_columns');

        if (! is_array($value) || ! array_is_list($value)) {
            $errors[$path] = 'The Columns field must be an array of strings.';

            return [];
        }

        if ($value === []) {
            $errors[$path] = 'The Columns field must define at least one column.';

            return [];
        }

        if (count($value) > $maxColumns) {
            $errors[$path] = "A table may not exceed {$maxColumns} columns.";

            return [];
        }

        foreach ($value as $index => $cell) {
            if (! is_string($cell)) {
                $errors["{$path}.{$index}"] = 'A column heading must be a string.';
            }
        }

        return array_values(array_filter($value, is_string(...)));
    }

    /**
     * @param  array<string, mixed>  $rawProps
     * @param  array<string, string>  $errors
     * @return list<list<string>>
     */
    private function validateStringGrid(array $rawProps, mixed $value, string $path, array &$errors): array
    {
        $maxRows = (int) config('evidence.limits.max_table_rows');
        $maxColumns = (int) config('evidence.limits.max_table_columns');
        $expected = is_array($rawProps['headers'] ?? null) ? count($rawProps['headers']) : null;

        if (! is_array($value) || ! array_is_list($value)) {
            $errors[$path] = 'The Rows field must be an array of rows.';

            return [];
        }

        if (count($value) > $maxRows) {
            $errors[$path] = "A table may not exceed {$maxRows} rows.";

            return [];
        }

        $rows = [];

        foreach ($value as $rowIndex => $row) {
            $rowPath = "{$path}.{$rowIndex}";

            if (! is_array($row) || ! array_is_list($row)) {
                $errors[$rowPath] = 'A row must be an array of strings.';

                continue;
            }

            if ($expected !== null && count($row) !== $expected) {
                $errors[$rowPath] = sprintf('A row must have %d cells; %d given.', $expected, count($row));
            }

            if (count($row) > $maxColumns) {
                $errors[$rowPath] = "A row may not exceed {$maxColumns} cells.";
            }

            $cells = [];

            foreach ($row as $cellIndex => $cell) {
                if (! is_string($cell)) {
                    $errors["{$rowPath}.{$cellIndex}"] = 'A cell must be a string.';

                    continue;
                }

                $cells[] = $cell;
            }

            $rows[] = $cells;
        }

        return $rows;
    }

    /**
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function validateArtifact(mixed $payload, array &$errors): array
    {
        if ($payload === null) {
            return [];
        }

        if (! $this->looksLikeObject($payload)) {
            $errors['content_payload'] = 'The content payload must be an object.';

            return [];
        }

        $kind = $payload['kind'] ?? null;
        $model3dEnabled = (bool) config('evidence.features.model_3d');

        return match ($kind) {
            'html' => $this->validateArtifactHtml($payload, $errors),
            'model_3d' => $model3dEnabled
                ? $this->validateArtifactModel($payload, $errors)
                : $this->rejectDisabledModel3d($errors),
            null => $this->rejectMissingArtifactKind($errors),
            default => $this->rejectUnknownArtifactKind($kind, $model3dEnabled, $errors),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function validateArtifactHtml(array $payload, array &$errors): array
    {
        $this->rejectUnknownKeys($payload, ['kind', 'html', 'css'], 'content_payload', $errors);

        $html = $payload['html'] ?? null;
        $css = $payload['css'] ?? null;

        if (! is_string($html) || trim($html) === '') {
            $errors['content_payload.html'] = 'The artifact body is required.';

            return ['kind' => 'html', 'html' => '', 'css' => ''];
        }

        $maxHtml = (int) config('evidence.limits.max_artifact_html_bytes');

        if (strlen($html) > $maxHtml) {
            $errors['content_payload.html'] = "The artifact body may not exceed {$maxHtml} bytes.";

            return ['kind' => 'html', 'html' => '', 'css' => ''];
        }

        $css = $css === null ? '' : $css;

        if (! is_string($css)) {
            $errors['content_payload.css'] = 'The artifact stylesheet must be a string.';

            return ['kind' => 'html', 'html' => '', 'css' => ''];
        }

        $maxCss = (int) config('evidence.limits.max_artifact_css_bytes');

        if (strlen($css) > $maxCss) {
            $errors['content_payload.css'] = "The artifact stylesheet may not exceed {$maxCss} bytes.";
        } else {
            try {
                $this->artifactSanitizer->assertCssIsSafe($css);
            } catch (UnsafeArtifactStylesheetException $exception) {
                $errors['content_payload.css'] = $exception->getMessage();
            }
        }

        return [
            'kind' => 'html',
            'html' => $this->artifactSanitizer->sanitizeHtml($html),
            'css' => $css,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function validateArtifactModel(array $payload, array &$errors): array
    {
        $this->rejectUnknownKeys($payload, ['kind', 'model_asset_id', 'stage_height'], 'content_payload', $errors);

        $assetId = $payload['model_asset_id'] ?? null;

        if (! is_int($assetId) && ! (is_string($assetId) && ctype_digit($assetId))) {
            $errors['content_payload.model_asset_id'] = 'A model asset id is required.';
            $assetId = 0;
        }

        $stageHeight = $payload['stage_height'] ?? 640;

        if (! is_int($stageHeight) && ! is_float($stageHeight)) {
            $errors['content_payload.stage_height'] = 'The stage height must be a number.';
            $stageHeight = 640;
        }

        $stageHeight = (int) $stageHeight;

        if ($stageHeight < 120 || $stageHeight > 2000) {
            $errors['content_payload.stage_height'] = 'The stage height must be between 120 and 2000.';
        }

        return [
            'kind' => 'model_3d',
            'model_asset_id' => (int) $assetId,
            'stage_height' => $stageHeight,
        ];
    }

    /**
     * Media content is carried entirely by the evidence assets, so a payload is
     * only acceptable when it is genuinely empty. Silently keeping a stale
     * payload here would be the kind of thing that reads as a bug a year later.
     *
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function validateMedia(mixed $payload, array &$errors): ?array
    {
        if ($payload === null || $payload === []) {
            // Null rather than an empty array: a media evidence genuinely has no
            // payload, and the detail contract types this field as null. Storing
            // [] would hand every client an empty object instead.
            return null;
        }

        $errors['content_payload'] = sprintf(
            'A %s evidence carries its content in its assets and must not have a content payload.',
            ViewerStrategy::Media->value
        );

        return null;
    }

    /**
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function rejectMissingArtifactKind(array &$errors): array
    {
        $errors['content_payload.kind'] = 'An artifact payload must declare kind: html or model_3d.';

        return [];
    }

    /**
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function rejectUnknownArtifactKind(mixed $kind, bool $model3dEnabled, array &$errors): array
    {
        $known = $model3dEnabled ? 'html, model_3d' : 'html';

        $errors['content_payload.kind'] = sprintf(
            'Unknown artifact kind [%s]; expected one of: %s.',
            is_string($kind) ? $kind : get_debug_type($kind),
            $known
        );

        return [];
    }

    /**
     * @param  array<string, string>  $errors
     * @return array<string, mixed>
     */
    private function rejectDisabledModel3d(array &$errors): array
    {
        $errors['content_payload.kind'] = '3D artifacts are disabled. Set EVIDENCE_MODEL_3D=true to enable them.';

        return [];
    }

    /**
     * @param  array<string, mixed>  $subject
     * @param  list<string>  $allowed
     * @param  array<string, string>  $errors
     */
    private function rejectUnknownKeys(array $subject, array $allowed, string $path, array &$errors): void
    {
        foreach (array_keys($subject) as $key) {
            if (! in_array($key, $allowed, true)) {
                $errors["{$path}.{$key}"] = sprintf(
                    'Unknown property [%s]; expected one of: %s.',
                    is_string($key) ? $key : get_debug_type($key),
                    implode(', ', $allowed)
                );
            }
        }
    }

    /**
     * A JSON object decodes to an associative array, but an empty JSON object
     * and an empty JSON array are indistinguishable in PHP, so [] is accepted
     * as an object and reported on by its missing keys instead.
     */
    private function looksLikeObject(mixed $value): bool
    {
        return is_array($value) && (! array_is_list($value) || $value === []);
    }

    /**
     * @param  array<string, true>  $seen
     */
    private function checkId(mixed $id, string $path, array &$seen): ?string
    {
        if (! is_string($id) || trim($id) === '') {
            return 'An id is required.';
        }

        if (strlen($id) > 64) {
            return 'An id may not exceed 64 characters.';
        }

        if (isset($seen[$id])) {
            return sprintf('The id [%s] is already used in this evidence.', $id);
        }

        $seen[$id] = true;

        return null;
    }
}
