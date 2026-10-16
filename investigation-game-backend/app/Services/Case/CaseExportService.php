<?php

namespace App\Services\Case;

use App\Models\Choice;
use App\Models\GameCase;
use App\Models\Level;
use Illuminate\Support\Facades\Log;
use ZipArchive;

/**
 * Serializes a case's full graph into a `case-bundle.zip` that mirrors
 * {@see CaseImportService}.
 *
 * Local media is archived from disk; Cloudinary/remote media is downloaded with
 * a per-asset timeout. Assets that cannot be retrieved are recorded in `$omitted`
 * and simply left out of the archive (and out of the manifest) rather than
 * silently producing a broken bundle.
 */
class CaseExportService
{
    /** @var array<int, string> */
    private array $omitted = [];

    /** @var array<int, string> */
    private array $tempFiles = [];

    /** @var array<string, true> */
    private array $usedEntries = [];

    public function __construct(private readonly CaseBundleMediaResolver $mediaResolver) {}

    /**
     * Build the bundle archive and return the path to the generated temp file.
     */
    public function export(GameCase $case): string
    {
        $this->ensureZipExtension();

        $this->omitted = [];
        $this->tempFiles = [];
        $this->usedEntries = [];

        $case->load([
            'zones.levels.questions.choices',
            'evidences',
            'characters',
            'investigationRequests.requiredEvidences',
            'investigationRequests.requiredCharacters',
        ]);

        $zipPath = tempnam(sys_get_temp_dir(), 'case-bundle-');

        if ($zipPath === false) {
            throw new \RuntimeException('Could not allocate a temporary file for the case bundle.');
        }

        $archive = new ZipArchive;

        if ($archive->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Could not open the case bundle archive for writing.');
        }

        try {
            $manifest = $this->buildManifest($case, $archive);

            $archive->addFromString(
                'case.json',
                (string) json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            );
        } finally {
            $archive->close();

            foreach ($this->tempFiles as $tempFile) {
                @unlink($tempFile);
            }
            $this->tempFiles = [];
        }

        foreach ($this->omitted as $url) {
            Log::warning("[CaseBundle] Could not archive media asset '{$url}' during export.");
        }

        return $zipPath;
    }

    private function buildManifest(GameCase $case, ZipArchive $archive): array
    {
        $manifest = [
            'format_version' => 1,
            'case' => [
                'title' => $case->title,
                'story' => $case->story,
                'map_url' => $case->map_url ?? '',
                'cover' => $this->addMedia($archive, $case->getRawOriginal('img_url'), 'media/cover'),
                'min_player_XP' => (int) $case->min_player_XP,
                'XP_on_solve' => (int) $case->XP_on_solve,
                'max_strikes' => (int) $case->max_strikes,
                'rating_stars' => (float) $case->rating_stars,
                'age_rating' => $case->age_rating,
                'estimated_playtime' => $case->estimated_playtime,
                'difficulty' => $case->difficulty,
                'tags' => $case->tags ?? [],
                'author_name' => $case->author_name,
                'is_published' => (bool) $case->is_published,
            ],
            'evidences' => [],
            'characters' => [],
            'investigation_requests' => [],
            'zones' => [],
        ];

        foreach ($case->evidences as $evidence) {
            $ref = $this->evidenceRef($evidence->id);

            $manifest['evidences'][] = [
                'ref_id' => $ref,
                'title' => $evidence->title,
                'description' => $evidence->description,
                'evidence_type' => $evidence->evidence_type->value,
                'metadata' => $evidence->metadata,
                'is_initial' => (bool) $evidence->is_initial,
                'is_vital_for_conviction' => (bool) $evidence->is_vital_for_conviction,
                'img' => $this->addMedia($archive, $evidence->getRawOriginal('img_url'), "media/evidences/{$ref}.img"),
                'audio' => $this->addMedia($archive, $evidence->getRawOriginal('audio_url'), "media/evidences/{$ref}.audio"),
            ];
        }

        foreach ($case->characters as $character) {
            $ref = $this->characterRef($character->id);

            $manifest['characters'][] = [
                'ref_id' => $ref,
                'name' => $character->name,
                'background' => $character->background,
                'is_initial' => (bool) $character->is_initial,
                'is_guilty' => (bool) $character->is_guilty,
                'charge' => $character->charge?->value,
                'default_status' => $character->default_status?->value,
                'img' => $this->addMedia($archive, $character->getRawOriginal('img_url'), "media/characters/{$ref}"),
            ];
        }

        foreach ($case->investigationRequests as $request) {
            $manifest['investigation_requests'][] = [
                'ref_id' => $this->requestRef($request->id),
                'request_type' => $request->request_type->value,
                'unlocks_evidence_ref' => $request->unlocks_evidence_id ? $this->evidenceRef($request->unlocks_evidence_id) : null,
                'unlocks_level_ref' => $request->unlocks_level_id ? $this->levelRef($request->unlocks_level_id) : null,
                'required_evidence_refs' => $request->requiredEvidences->map(fn ($e) => $this->evidenceRef($e->id))->values()->all(),
                'required_character_refs' => $request->requiredCharacters->map(fn ($c) => $this->characterRef($c->id))->values()->all(),
            ];
        }

        foreach ($case->zones as $zone) {
            $zoneManifest = [
                'title' => $zone->title,
                'description' => $zone->description,
                'order_index' => (int) $zone->order_index,
                'coord_x' => $zone->coord_x !== null ? (float) $zone->coord_x : null,
                'coord_y' => $zone->coord_y !== null ? (float) $zone->coord_y : null,
                'levels' => [],
            ];

            foreach ($zone->levels as $level) {
                $zoneManifest['levels'][] = $this->buildLevel($archive, $level);
            }

            $manifest['zones'][] = $zoneManifest;
        }

        return $manifest;
    }

    private function buildLevel(ZipArchive $archive, Level $level): array
    {
        $levelRef = $this->levelRef($level->id);

        $questions = $level->questions->values();
        $questionIndex = [];

        foreach ($questions as $index => $question) {
            $questionIndex[$question->id] = $index;
        }

        $nodes = [];

        foreach ($questions as $index => $question) {
            $nodes[] = [
                'text' => $question->text,
                'img' => $this->addMedia($archive, $question->getRawOriginal('img_url'), "media/nodes/{$levelRef}_{$index}.img"),
                'audio' => $this->addMedia($archive, $question->getRawOriginal('audio_url'), "media/nodes/{$levelRef}_{$index}.audio"),
                'choices' => $question->choices->map(fn (Choice $choice) => $this->buildChoice($choice, $questionIndex))->values()->all(),
            ];
        }

        return [
            'ref_id' => $levelRef,
            'title' => $level->title,
            'details' => $level->details,
            'order_index' => (int) $level->order_index,
            'is_initial' => (bool) $level->is_initial,
            'presentation_type' => $level->presentation_type->value,
            'required_request_ref' => $level->required_request_id ? $this->requestRef($level->required_request_id) : null,
            'img' => $this->addMedia($archive, $level->getRawOriginal('img_url'), "media/levels/{$levelRef}"),
            'nodes' => $nodes,
        ];
    }

    private function buildChoice(Choice $choice, array $questionIndex): array
    {
        $outcomes = $choice->outcomes ?? [];
        $mappedOutcomes = [];

        if (array_key_exists('feedback', $outcomes)) {
            $mappedOutcomes['feedback'] = $outcomes['feedback'];
        }
        if (array_key_exists('gives_strike', $outcomes)) {
            $mappedOutcomes['gives_strike'] = (bool) $outcomes['gives_strike'];
        }
        if (array_key_exists('next_question_id', $outcomes)) {
            $mappedOutcomes['next_question_index'] = $outcomes['next_question_id'] !== null
                ? ($questionIndex[$outcomes['next_question_id']] ?? null)
                : null;
        }
        if (! empty($outcomes['unlock_evidence'])) {
            $mappedOutcomes['unlock_evidence_refs'] = array_map(fn ($id) => $this->evidenceRef((int) $id), $outcomes['unlock_evidence']);
        }
        if (! empty($outcomes['unlock_levels'])) {
            $mappedOutcomes['unlock_levels_refs'] = array_map(fn ($id) => $this->levelRef((int) $id), $outcomes['unlock_levels']);
        }
        if (! empty($outcomes['character_updates'])) {
            $mappedOutcomes['character_updates'] = array_map(fn ($update) => [
                'ref_id' => $this->characterRef((int) $update['id']),
                'is_unlocked' => $update['is_unlocked'] ?? null,
                'status' => $update['status'] ?? null,
            ], $outcomes['character_updates']);
        }

        $requirements = $choice->requirements ?? [];
        $mappedRequirements = [];

        if (! empty($requirements['required_evidence'])) {
            $mappedRequirements['required_evidence_refs'] = array_map(fn ($id) => $this->evidenceRef((int) $id), $requirements['required_evidence']);
        }
        if (! empty($requirements['required_choices'])) {
            $mappedRequirements['required_choice_refs'] = array_map(fn ($id) => $this->choiceRef((int) $id), $requirements['required_choices']);
        }

        return [
            'ref_id' => $this->choiceRef($choice->id),
            'text' => $choice->text,
            'outcomes' => $mappedOutcomes,
            'requirements' => $mappedRequirements,
        ];
    }

    /**
     * Add a media asset to the archive and return its manifest-relative path,
     * or null when there is nothing to archive / the asset is unreachable.
     */
    private function addMedia(ZipArchive $archive, ?string $rawUrl, string $baseEntry): ?string
    {
        if (! $rawUrl) {
            return null;
        }

        $extension = $this->extensionFromUrl($rawUrl);
        $entry = $extension !== '' ? "{$baseEntry}.{$extension}" : $baseEntry;
        $entry = $this->uniqueEntry($entry);

        if (str_starts_with($rawUrl, '/assets/')) {
            $absolutePath = $this->mediaResolver->archiveLocal($rawUrl);
        } else {
            $absolutePath = $this->mediaResolver->fetchRemote($rawUrl);

            if ($absolutePath !== null) {
                $this->tempFiles[] = $absolutePath;
            }
        }

        if ($absolutePath === null || ! is_file($absolutePath)) {
            $this->omitted[] = $rawUrl;

            return null;
        }

        $archive->addFile($absolutePath, $entry);

        return $entry;
    }

    private function uniqueEntry(string $entry): string
    {
        if (! isset($this->usedEntries[$entry])) {
            $this->usedEntries[$entry] = true;

            return $entry;
        }

        $counter = 1;
        $candidate = $entry;

        while (isset($this->usedEntries[$candidate])) {
            $candidate = "{$entry}-{$counter}";
            $counter++;
        }

        $this->usedEntries[$candidate] = true;

        return $candidate;
    }

    private function extensionFromUrl(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH) ?: '';
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return preg_match('/^[a-z0-9]{1,8}$/', $extension) ? $extension : '';
    }

    private function evidenceRef(int $id): string
    {
        return "ev_{$id}";
    }

    private function characterRef(int $id): string
    {
        return "ch_{$id}";
    }

    private function levelRef(int $id): string
    {
        return "lvl_{$id}";
    }

    private function requestRef(int $id): string
    {
        return "req_{$id}";
    }

    private function choiceRef(int $id): string
    {
        return "choice_{$id}";
    }

    private function ensureZipExtension(): void
    {
        if (! class_exists(ZipArchive::class)) {
            throw new \RuntimeException(
                'The PHP `zip` extension is required to export a case bundle. Enable ext-zip and try again.'
            );
        }
    }
}
