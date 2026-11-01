<?php

namespace App\Services\Case;

use App\Models\Choice;
use App\Models\GameCase;
use App\Models\Level;
use App\Support\MetadataImageReferences;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use ZipArchive;

/**
 * Serializes a case's full graph into a `case-bundle.zip` that mirrors
 * {@see CaseImportService}.
 *
 * Local media is archived from disk; approved Cloudinary media is downloaded.
 * Referenced media must be included for the export to succeed.
 */
class CaseExportService
{
    private array $mediaErrors = [];

    /** @var array<int, string> */
    private array $tempFiles = [];

    /** @var array<string, true> */
    private array $usedEntries = [];

    private array $archivedMedia = [];

    public function __construct(private readonly CaseBundleMediaResolver $mediaResolver) {}

    /**
     * Build the bundle archive and return the path to the generated temp file.
     */
    public function export(GameCase $case): string
    {
        $this->ensureZipExtension();

        $this->mediaErrors = [];
        $this->tempFiles = [];
        $this->usedEntries = [];
        $this->archivedMedia = [];

        $case->load([
            'zones.levels.questions.choices',
            'evidences',
            'characters',
            'investigationRequests.requiredEvidences',
            'investigationRequests.requiredCharacters',
        ]);

        $archive = app(ZipArchive::class);
        $zipPath = tempnam(sys_get_temp_dir(), 'case-bundle-');

        if ($zipPath === false) {
            throw new \RuntimeException('Could not allocate a temporary file for the case bundle.');
        }

        $opened = false;
        $completed = false;

        try {
            $opened = $archive->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true;
            if (! $opened) {
                throw new \RuntimeException('Could not open the case bundle archive for writing.');
            }

            $manifest = $this->buildManifest($case, $archive);
            if ($this->mediaErrors !== []) {
                throw ValidationException::withMessages($this->mediaErrors);
            }

            if (! $archive->addFromString(
                'case.json',
                json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
            )) {
                throw new \RuntimeException('Could not write the case bundle manifest.');
            }

            $opened = false;
            if (! @$archive->close()) {
                throw new \RuntimeException('Could not complete the case bundle archive.');
            }

            $opened = $archive->open($zipPath, ZipArchive::RDONLY | ZipArchive::CHECKCONS) === true;
            if (! $opened) {
                throw new \RuntimeException('Could not verify the case bundle archive.');
            }
            foreach (['case.json', ...array_values($this->archivedMedia)] as $entry) {
                if ($archive->locateName($entry) === false) {
                    throw new \RuntimeException('The case bundle archive is incomplete.');
                }
            }
            $opened = false;
            if (! $archive->close()) {
                throw new \RuntimeException('Could not close the verified case bundle archive.');
            }
            $completed = true;
        } finally {
            try {
                if ($opened) {
                    $archive->unchangeAll();
                    $archive->close();
                }
            } finally {
                foreach ($this->tempFiles as $tempFile) {
                    @unlink($tempFile);
                }
                $this->tempFiles = [];

                if (! $completed) {
                    @unlink($zipPath);
                }
            }
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
                'map' => $this->addMedia($archive, $case->getRawOriginal('map_url'), 'media/map', 'case.map'),
                'cover' => $this->addMedia($archive, $case->getRawOriginal('img_url'), 'media/cover', 'case.cover'),
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

        foreach ($case->evidences as $index => $evidence) {
            $ref = $this->evidenceRef($evidence->id);
            $metadata = $evidence->metadata;
            $imageIndex = 0;
            foreach (MetadataImageReferences::paths($metadata) as $path => $url) {
                Arr::set($metadata, $path, $this->addMedia($archive, $url, "media/evidences/{$ref}.blocks.".$imageIndex++, "evidences.{$index}.metadata.{$path}"));
            }

            $manifest['evidences'][] = [
                'ref_id' => $ref,
                'title' => $evidence->title,
                'description' => $evidence->description,
                'evidence_type' => $evidence->evidence_type->value,
                'metadata' => $metadata,
                'is_initial' => (bool) $evidence->is_initial,
                'is_vital_for_conviction' => (bool) $evidence->is_vital_for_conviction,
                'img' => $this->addMedia($archive, $evidence->getRawOriginal('img_url'), "media/evidences/{$ref}.img", "evidences.{$index}.img"),
                'audio' => $this->addMedia($archive, $evidence->getRawOriginal('audio_url'), "media/evidences/{$ref}.audio", "evidences.{$index}.audio"),
            ];
        }

        foreach ($case->characters as $index => $character) {
            $ref = $this->characterRef($character->id);

            $manifest['characters'][] = [
                'ref_id' => $ref,
                'name' => $character->name,
                'background' => $character->background,
                'is_initial' => (bool) $character->is_initial,
                'is_guilty' => (bool) $character->is_guilty,
                'charge' => $character->charge?->value,
                'default_status' => $character->default_status?->value,
                'img' => $this->addMedia($archive, $character->getRawOriginal('img_url'), "media/characters/{$ref}", "characters.{$index}.img"),
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

        foreach ($case->zones as $zoneIndex => $zone) {
            $zoneManifest = [
                'title' => $zone->title,
                'description' => $zone->description,
                'order_index' => (int) $zone->order_index,
                'coord_x' => $zone->coord_x !== null ? (float) $zone->coord_x : null,
                'coord_y' => $zone->coord_y !== null ? (float) $zone->coord_y : null,
                'levels' => [],
            ];

            foreach ($zone->levels as $levelIndex => $level) {
                $zoneManifest['levels'][] = $this->buildLevel($archive, $level, "zones.{$zoneIndex}.levels.{$levelIndex}");
            }

            $manifest['zones'][] = $zoneManifest;
        }

        return $manifest;
    }

    private function buildLevel(ZipArchive $archive, Level $level, string $field): array
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
                'order_index' => (int) $question->order_index,
                'text' => $question->text,
                'img' => $this->addMedia($archive, $question->getRawOriginal('img_url'), "media/nodes/{$levelRef}_{$index}.img", "{$field}.nodes.{$index}.img"),
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
            'img' => $this->addMedia($archive, $level->getRawOriginal('img_url'), "media/levels/{$levelRef}", "{$field}.img"),
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
        if (! empty($outcomes['unlock_location_points'])) {
            $mappedOutcomes['unlock_location_point_refs'] = array_map(fn ($id) => $this->choiceRef((int) $id), $outcomes['unlock_location_points']);
        }
        if (! empty($outcomes['character_updates'])) {
            $mappedOutcomes['character_updates'] = array_map(fn ($update) => array_filter([
                'ref_id' => $this->characterRef((int) $update['id']),
                'is_unlocked' => $update['is_unlocked'] ?? null,
                'status' => $update['status'] ?? null,
            ], fn ($value) => $value !== null), $outcomes['character_updates']);
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
     * or null when there is nothing to archive or a field error was recorded.
     */
    private function addMedia(ZipArchive $archive, ?string $rawUrl, string $baseEntry, string $field): ?string
    {
        if (! $rawUrl) {
            return null;
        }
        if (isset($this->archivedMedia[$rawUrl])) {
            return $this->archivedMedia[$rawUrl];
        }

        $extension = $this->extensionFromUrl($rawUrl);
        $entry = $extension !== '' ? "{$baseEntry}.{$extension}" : $baseEntry;
        $entry = $this->uniqueEntry($entry);

        $absolutePath = $this->mediaResolver->archiveLocal($rawUrl);
        if ($absolutePath === null && filter_var($rawUrl, FILTER_VALIDATE_URL)
            && strtolower((string) parse_url($rawUrl, PHP_URL_HOST)) !== strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST))) {
            try {
                $absolutePath = $this->mediaResolver->fetchRemote($rawUrl);
            } catch (ValidationException $exception) {
                throw ValidationException::withMessages([$field => Arr::flatten($exception->errors())]);
            }

            if ($absolutePath !== null) {
                $this->tempFiles[] = $absolutePath;
            }
        }

        if ($absolutePath === null || ! is_file($absolutePath) || ! is_readable($absolutePath)) {
            $this->mediaErrors[$field] = 'The referenced media file is missing or unreadable.';

            return null;
        }

        if (! $archive->addFile($absolutePath, $entry)) {
            $this->mediaErrors[$field] = 'The referenced media file could not be added to the bundle.';

            return null;
        }

        return $this->archivedMedia[$rawUrl] = $entry;
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
