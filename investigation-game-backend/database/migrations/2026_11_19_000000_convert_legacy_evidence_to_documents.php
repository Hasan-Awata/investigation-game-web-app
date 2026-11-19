<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            DB::table('evidences')->where('evidence_type', 'digital')
                ->select('id', 'title', 'metadata')
                ->chunkById(100, function ($rows) {
                    foreach ($rows as $row) {
                        $metadata = json_decode($row->metadata ?? '{}', true, flags: JSON_THROW_ON_ERROR);

                        DB::table('evidences')->where('id', $row->id)->update([
                            'evidence_type' => 'document',
                            'metadata' => json_encode(
                                $this->documentMetadata(is_array($metadata) ? $metadata : [], $row->title),
                                JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                            ),
                        ]);
                    }
                });
        });
    }

    public function down(): void
    {
        // Keep converted documents and edits made to them after the migration.
    }

    private function documentMetadata(array $metadata, string $title): array
    {
        $session = $metadata['terminal'] ?? null;
        $blocks = [['type' => 'letterhead', 'span' => 12, 'props' => ['title' => $title]]];
        $sourceBlocks = is_array($session) ? ($session['blocks'] ?? []) : [];

        if (! is_array($sourceBlocks)) {
            $sourceBlocks = [$sourceBlocks];
        }

        foreach ($sourceBlocks as $block) {
            $props = is_array($block['props'] ?? null) ? $block['props'] : [];
            if (($block['type'] ?? null) === 'spacer' && is_numeric($props['height'] ?? null)) {
                $blocks[] = ['type' => 'spacer', 'span' => 12, 'props' => ['height' => max(0, (float) $props['height'])]];

                continue;
            }

            $text = match ($block['type'] ?? null) {
                'status_banner' => $this->lines([$props['text'] ?? '', $props['caption'] ?? '']),
                'prompt_line' => $this->lines([
                    trim($this->text($props['prompt'] ?? '').' '.$this->text($props['command'] ?? '')),
                    $this->lines($props['output'] ?? []),
                ]),
                'output_stream' => $this->lines([$props['label'] ?? '', $this->lines($props['lines'] ?? [])]),
                'file_tree' => $this->fileEntries($props['entries'] ?? []),
                default => $this->text($block),
            };

            if ($text !== '') {
                $blocks[] = [
                    'type' => 'prose',
                    'span' => 12,
                    'props' => ['html' => '<p>'.nl2br(htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false).'</p>', 'tone' => 'mono'],
                ];
            }
        }

        unset($metadata['terminal']);
        $metadata['doc'] = ['v' => 1, 'theme' => 'dossier', 'page' => ['w' => 800, 'minH' => 1131, 'pad' => 64], 'blocks' => $blocks];

        return $metadata;
    }

    private function fileEntries(mixed $entries): string
    {
        if (! is_array($entries)) {
            return $this->text($entries);
        }

        return $this->lines(array_map(
            fn (mixed $entry): string => is_array($entry)
                ? implode('  ', array_map($this->text(...), $entry))
                : $this->text($entry),
            $entries,
        ));
    }

    private function lines(mixed $values): string
    {
        return is_array($values) ? trim(implode("\n", array_map($this->text(...), $values))) : $this->text($values);
    }

    private function text(mixed $value): string
    {
        return is_string($value) ? $value : json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
};
