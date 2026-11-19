<?php

namespace App\Support;

use Generator;

final class EvidenceTemplateCatalog
{
    private static ?array $definitions = null;

    public static function definition(string $id, int $version): ?array
    {
        self::$definitions ??= json_decode(file_get_contents(config_path('evidence-template-catalog.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach (self::$definitions as $definition) {
            if ($definition['id'] === $id && $definition['version'] === $version) {
                return $definition;
            }
        }

        return null;
    }

    public static function errors(mixed $template, string $type, array $uploads = []): array
    {
        if (! is_array($template) || ! is_string($template['id'] ?? null) || ! is_int($template['version'] ?? null)
            || ! is_array($template['values'] ?? null) || array_diff(array_keys($template), ['id', 'version', 'values'])) {
            return ['metadata.template' => ['Provide a template ID, version and field values.']];
        }

        $definition = self::definition($template['id'], $template['version']);
        if ($definition === null) {
            return ['metadata.template.version' => ['This evidence template version is unavailable.']];
        }
        if (! in_array($type, $definition['types'], true)) {
            return ['metadata.template.id' => ['This template does not support the selected evidence type.']];
        }

        $errors = self::fieldErrors($definition['fields'], $template['values'], 'metadata.template.values', $uploads);
        $imageKeys = array_column(array_filter($definition['fields'], fn (array $field) => $field['kind'] === 'image'), 'key');
        foreach (array_diff(array_keys($uploads), $imageKeys) as $key) {
            $errors["template_images.{$key}"][] = 'The upload does not match a template image field.';
        }

        return $errors;
    }

    private static function fieldErrors(array $fields, array $values, string $prefix, array $uploads = []): array
    {
        $errors = [];
        foreach (array_diff(array_keys($values), array_column($fields, 'key')) as $key) {
            $errors["{$prefix}.{$key}"][] = 'This field is not defined by the template.';
        }
        foreach ($fields as $field) {
            $key = $field['key'];
            $path = "{$prefix}.{$key}";
            $value = $values[$key] ?? null;
            $empty = $value === null || $value === [] || (is_string($value) && preg_match('/^\s*$/u', $value));
            if (($field['required'] ?? false) && $empty && ! isset($uploads[$key])) {
                $errors[$path][] = 'This field is required.';

                continue;
            }
            if ($value === null || ($value === '' && $field['kind'] !== 'rows')) {
                continue;
            }
            if ($field['kind'] === 'rows') {
                if (! is_array($value) || ! array_is_list($value) || count($value) > $field['max']) {
                    $errors[$path][] = "Provide a list of up to {$field['max']} rows.";

                    continue;
                }
                foreach ($value as $index => $row) {
                    if (! is_array($row)) {
                        $errors["{$path}.{$index}"][] = 'Provide row field values.';

                        continue;
                    }
                    $errors += self::fieldErrors($field['fields'], $row, "{$path}.{$index}");
                }

                continue;
            }
            if (! is_string($value)) {
                $errors[$path][] = 'Provide a text value.';
            } elseif ($field['kind'] === 'date' && ! self::isDate($value)) {
                $errors[$path][] = 'Provide a valid date in YYYY-MM-DD format.';
            } elseif (mb_strlen($value) > ($field['max'] ?? 2048)) {
                $errors[$path][] = 'This value exceeds the field length limit.';
            }
        }

        return $errors;
    }

    private static function isDate(string $value): bool
    {
        return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $value, $parts)
            && checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
    }

    public static function imagePaths(mixed $template): Generator
    {
        if (! is_array($template) || ! is_string($template['id'] ?? null) || ! is_int($template['version'] ?? null)) {
            return;
        }
        $definition = self::definition($template['id'], $template['version']);
        foreach ($definition['fields'] ?? [] as $field) {
            $value = $template['values'][$field['key']] ?? null;
            if ($field['kind'] === 'image' && is_string($value) && $value !== '') {
                yield "template.values.{$field['key']}" => $value;
            }
        }
    }
}
