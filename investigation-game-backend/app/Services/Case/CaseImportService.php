<?php

namespace App\Services\Case;

use App\Models\Character;
use App\Models\Choice;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\InvestigationRequest;
use App\Models\Level;
use App\Models\Question;
use App\Models\Zone;
use App\Services\MediaService;
use App\Support\Case\CaseManifestValidator;
use App\Support\MetadataImageReferences;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use ZipArchive;

/**
 * Imports a case bundle (`case-bundle.zip`) into the database.
 *
 * The whole graph is written in a single transaction. Reference ids that live
 * only inside the manifest are resolved to real database ids in a fixed pass
 * order, so forward references (a choice requirement pointing at a choice in a
 * later node, a level gated behind a later request) always resolve.
 */
class CaseImportService
{
    private array $createdMedia = [];

    private array $resolvedMedia = [];

    private ?string $mediaDirectory = null;

    public function __construct(
        private readonly CaseManifestValidator $validator,
        private readonly CaseBundleMediaResolver $mediaResolver,
        private readonly MediaService $mediaService,
    ) {}

    /**
     * Import a case atomically after validating all manifest entities before persistence.
     *
     * Validation collects per-entity errors before the database transaction; persistence
     * uses one transaction so a failed case graph is never partially committed.
     */
    public function import(UploadedFile $zip, bool $storeLocally): GameCase
    {
        $this->ensureZipExtension();

        $directory = 'tmp/case-bundle-'.Str::uuid();
        $extractDir = Storage::disk('local')->path($directory);

        try {
            if (! Storage::disk('local')->makeDirectory($directory)) {
                throw ValidationException::withMessages([
                    'file' => ['The bundle extraction directory could not be created.'],
                ]);
            }

            $this->extract($zip, $extractDir);

            $manifest = $this->readManifest($extractDir);

            $this->validator->validate($manifest, $extractDir);

            $title = $manifest['case']['title'];

            if (GameCase::where('title', $title)->exists()) {
                throw ValidationException::withMessages([
                    'case.title' => ["A case titled '{$title}' already exists. Import is add-only."],
                ]);
            }

            return DB::transaction(fn () => $this->persist($manifest, $extractDir, $storeLocally));
        } catch (\Throwable $exception) {
            foreach ($this->createdMedia as $url) {
                try {
                    $this->mediaService->delete($url);
                } catch (\Throwable) {
                    Log::warning('Failed to clean up media from a failed case import.');
                }
            }

            try {
                if ($this->mediaDirectory !== null && ! File::deleteDirectory($this->mediaDirectory)) {
                    Log::warning('Failed to remove the failed case import media directory.');
                }
            } catch (\Throwable) {
                Log::warning('Failed to remove the failed case import media directory.');
            }

            throw $exception;
        } finally {
            $this->createdMedia = [];
            $this->resolvedMedia = [];
            $this->mediaDirectory = null;
            try {
                if (! Storage::disk('local')->deleteDirectory($directory)) {
                    Log::warning('Failed to remove the case bundle extraction directory.');
                }
            } catch (\Throwable) {
                Log::warning('Failed to remove the case bundle extraction directory.');
            }
        }
    }

    private function extract(UploadedFile $zip, string $extractDir): void
    {
        $archive = new ZipArchive;
        $opened = $archive->open($zip->getRealPath());

        if ($opened !== true) {
            throw ValidationException::withMessages([
                'file' => ['The uploaded file is not a readable ZIP archive.'],
            ]);
        }

        $directoryStream = null;

        try {
            $maxFileBytes = config('case_bundles.max_file_bytes');
            $maxTotalBytes = config('case_bundles.max_total_bytes');
            $maxManifestBytes = config('case_bundles.max_manifest_bytes');
            $extractionError = ['file' => ['The ZIP archive could not be extracted.']];
            $sizeError = ['file' => ['The ZIP archive exceeds the expanded file, total, or manifest size limit.']];
            $entries = [];
            $names = [];
            $totalBytes = 0;

            if ($archive->numFiles > config('case_bundles.max_entries')) {
                throw ValidationException::withMessages([
                    'file' => ['The ZIP archive contains too many entries.'],
                ]);
            }

            // libzip replaces embedded NUL bytes with spaces, even with FL_ENC_RAW.
            $tail = @file_get_contents($zip->getRealPath(), false, null, max(0, $zip->getSize() - 65557), 65557);
            $end = $tail === false ? false : strrpos($tail, "PK\x05\x06");

            if ($end === false || strlen($tail) - $end < 22) {
                throw ValidationException::withMessages($extractionError);
            }

            $offset = unpack('Voffset', substr($tail, $end + 16, 4))['offset'];
            $directoryStream = @fopen($zip->getRealPath(), 'rb');

            if ($directoryStream === false || @fseek($directoryStream, $offset) !== 0) {
                throw ValidationException::withMessages($extractionError);
            }

            for ($i = 0; $i < $archive->numFiles; $i++) {
                $header = @fread($directoryStream, 46);

                if ($header === false || strlen($header) !== 46 || substr($header, 0, 4) !== "PK\x01\x02") {
                    throw ValidationException::withMessages($extractionError);
                }

                $lengths = unpack('vname/vextra/vcomment', substr($header, 28, 6));
                $rawName = $lengths['name'] === 0 ? '' : @fread($directoryStream, $lengths['name']);
                $stat = $archive->statIndex($i, ZipArchive::FL_ENC_RAW);

                if ($rawName === false || strlen($rawName) !== $lengths['name']
                    || @fseek($directoryStream, $lengths['extra'] + $lengths['comment'], SEEK_CUR) !== 0
                    || $stat === false || ! $archive->getExternalAttributesIndex($i, $opsys, $attributes)) {
                    throw ValidationException::withMessages($extractionError);
                }

                $name = str_replace('\\', '/', $stat['name']);
                $key = mb_strtolower(rtrim($name, '/'), 'UTF-8');

                if ($name === '' || str_contains($rawName, "\0") || str_starts_with($name, '/')
                    || preg_match('#[\x00-\x1f\x7f:<>"|?*]|(^|/)(\.{1,2}|)(/|$)|[. ](/|$)|(^|/)(CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|COM[1-9¹²³]|LPT[1-9¹²³]) *(?:\.[^/]*)?(/|$)#iu', rtrim($name, '/')) !== 0
                    || isset($names[$key])) {
                    throw ValidationException::withMessages([
                        'file' => ['The ZIP archive contains an unsafe or duplicate path.'],
                    ]);
                }

                $isDirectory = str_ends_with($name, '/');
                $type = ($attributes >> 16) & 0170000;

                if (($type !== 0 && $type !== ($isDirectory ? 0040000 : 0100000))
                    || ($attributes & 0x400) !== 0 || ($isDirectory && $stat['size'] !== 0)) {
                    throw ValidationException::withMessages([
                        'file' => ['The ZIP archive contains a link or unsupported file entry.'],
                    ]);
                }

                $limit = $key === 'case.json' ? min($maxFileBytes, $maxManifestBytes) : $maxFileBytes;
                $totalBytes += $stat['size'];

                if ($stat['size'] < 0 || $stat['size'] > $limit || $totalBytes > $maxTotalBytes) {
                    throw ValidationException::withMessages($sizeError);
                }

                $names[$key] = true;
                $entries[] = [$name, $stat['size'], $limit, $isDirectory];
            }

            $totalBytes = 0;

            foreach ($entries as $index => [$name, $declaredBytes, $limit, $isDirectory]) {
                $path = $extractDir.'/'.$name;
                $parent = $isDirectory ? $path : dirname($path);

                if (! is_dir($parent) && ! @mkdir($parent, 0755, true) && ! is_dir($parent)) {
                    throw ValidationException::withMessages($extractionError);
                }

                if ($isDirectory) {
                    continue;
                }

                $input = @$archive->getStreamIndex($index);
                $output = null;

                try {
                    if ($input === false || ($output = @fopen($path, 'xb')) === false) {
                        throw ValidationException::withMessages($extractionError);
                    }

                    $fileBytes = 0;

                    while (! feof($input)) {
                        $chunk = @fread($input, 8192);

                        if ($chunk === false || ($chunk === '' && ! feof($input))) {
                            throw ValidationException::withMessages($extractionError);
                        }

                        $length = strlen($chunk);
                        $fileBytes += $length;
                        $totalBytes += $length;

                        if ($fileBytes > $limit || $totalBytes > $maxTotalBytes) {
                            throw ValidationException::withMessages($sizeError);
                        }

                        if (@fwrite($output, $chunk) !== $length) {
                            throw ValidationException::withMessages($extractionError);
                        }
                    }

                    if ($fileBytes !== $declaredBytes || ! @fclose($output)) {
                        throw ValidationException::withMessages($extractionError);
                    }
                } finally {
                    if (is_resource($input)) {
                        fclose($input);
                    }
                    if (is_resource($output)) {
                        fclose($output);
                    }
                }
            }
        } finally {
            if (is_resource($directoryStream)) {
                fclose($directoryStream);
            }
            $archive->close();
        }
    }

    private function readManifest(string $extractDir): array
    {
        $manifestPath = $extractDir.DIRECTORY_SEPARATOR.'case.json';

        if (! is_file($manifestPath)) {
            throw ValidationException::withMessages([
                'file' => ['The bundle must contain a case.json at its root.'],
            ]);
        }

        $limit = config('case_bundles.max_manifest_bytes');
        $contents = @file_get_contents($manifestPath, false, null, 0, $limit + 1);

        if ($contents === false || strlen($contents) > $limit) {
            throw ValidationException::withMessages([
                'file' => ['case.json could not be read within the manifest size limit.'],
            ]);
        }

        $decoded = json_decode($contents, true);

        if (! is_array($decoded)) {
            throw ValidationException::withMessages([
                'file' => ['case.json is not valid JSON.'],
            ]);
        }

        return $decoded;
    }

    private function persist(array $manifest, string $extractDir, bool $storeLocally): GameCase
    {
        $caseData = $manifest['case'];

        $case = GameCase::create([
            'title' => $caseData['title'],
            'story' => $caseData['story'],
            'map_url' => null,
            'min_player_XP' => $caseData['min_player_XP'] ?? 0,
            'XP_on_solve' => $caseData['XP_on_solve'],
            'max_strikes' => $caseData['max_strikes'] ?? 3,
            'rating_stars' => $caseData['rating_stars'] ?? 5.0,
            'age_rating' => $caseData['age_rating'] ?? 'Unrated',
            'estimated_playtime' => $caseData['estimated_playtime'] ?? null,
            'difficulty' => $caseData['difficulty'] ?? 'Standard',
            'tags' => $caseData['tags'] ?? [],
            'author_name' => $caseData['author_name'] ?? 'System Admin',
            'is_published' => (bool) ($caseData['is_published'] ?? false),
            'img_url' => null,
        ]);

        if ($storeLocally) {
            $caseFolder = $this->mediaService->resolveCaseFolder($case->title, $case->id);
            $mediaDirectory = public_path("assets/cases/{$caseFolder}");
            if (! @mkdir($mediaDirectory, 0755, true)) {
                throw ValidationException::withMessages(['media' => 'A new case media directory could not be created. Import is add-only.']);
            }
            $this->mediaDirectory = $mediaDirectory;
        }

        $case->update([
            'img_url' => $this->resolve($extractDir, $caseData['cover'] ?? null, $caseData['title'], 'Cover', $storeLocally, $case->id),
            'map_url' => $this->resolve($extractDir, $caseData['map'] ?? null, $caseData['title'], 'Map', $storeLocally, $case->id),
        ]);

        $maps = [
            'evidence' => [],
            'character' => [],
            'level' => [],
            'request' => [],
            'choice' => [],
        ];

        // PASS 1: evidences + characters (the base entities other passes point at).
        foreach ($manifest['evidences'] ?? [] as $evidenceData) {
            $metadata = $evidenceData['metadata'] ?? null;
            if (is_string($metadata)) {
                $metadata = json_decode($metadata, true);
            }
            foreach (MetadataImageReferences::paths($metadata) as $path => $url) {
                Arr::set($metadata, $path, $this->resolve($extractDir, $url, $caseData['title'], 'Evidences/Blocks', $storeLocally, $case->id));
            }

            $evidence = Evidence::create([
                'case_id' => $case->id,
                'title' => $evidenceData['title'],
                'description' => $evidenceData['description'] ?? null,
                'evidence_type' => $evidenceData['evidence_type'],
                'metadata' => $metadata,
                'is_initial' => (bool) ($evidenceData['is_initial'] ?? false),
                'is_vital_for_conviction' => (bool) ($evidenceData['is_vital_for_conviction'] ?? false),
                'img_url' => $this->resolve($extractDir, $evidenceData['img'] ?? null, $caseData['title'], 'Evidences', $storeLocally, $case->id),
                'audio_url' => $this->resolve($extractDir, $evidenceData['audio'] ?? null, $caseData['title'], 'Evidences', $storeLocally, $case->id, isAudio: true),
            ]);

            $this->mapRef($maps, 'evidence', $evidenceData['ref_id'] ?? null, $evidence->id);
        }

        foreach ($manifest['characters'] ?? [] as $characterData) {
            $character = Character::create([
                'case_id' => $case->id,
                'name' => $characterData['name'],
                'background' => $characterData['background'] ?? null,
                'is_initial' => (bool) ($characterData['is_initial'] ?? false),
                'is_guilty' => (bool) ($characterData['is_guilty'] ?? false),
                'charge' => $characterData['charge'] ?? null,
                'default_status' => $characterData['default_status'] ?? 'available',
                'img_url' => $this->resolve($extractDir, $characterData['img'] ?? null, $caseData['title'], 'Characters', $storeLocally, $case->id),
            ]);

            $this->mapRef($maps, 'character', $characterData['ref_id'] ?? null, $character->id);
        }

        // PASS 2: zones + levels (required_request_id is patched in PASS 4).
        $levelRequiredRefs = [];
        $levelNodes = [];

        foreach ($manifest['zones'] ?? [] as $zoneData) {
            $zone = Zone::create([
                'case_id' => $case->id,
                'title' => $zoneData['title'],
                'description' => $zoneData['description'] ?? null,
                'order_index' => $zoneData['order_index'],
                'coord_x' => $zoneData['coord_x'] ?? null,
                'coord_y' => $zoneData['coord_y'] ?? null,
            ]);

            foreach ($zoneData['levels'] ?? [] as $levelData) {
                $level = Level::create([
                    'zone_id' => $zone->id,
                    'title' => $levelData['title'],
                    'details' => $levelData['details'],
                    'order_index' => $levelData['order_index'],
                    'is_initial' => (bool) ($levelData['is_initial'] ?? false),
                    'presentation_type' => $levelData['presentation_type'],
                    'required_request_id' => null,
                    'img_url' => $this->resolve($extractDir, $levelData['img'] ?? null, $caseData['title'], 'Levels', $storeLocally, $case->id),
                ]);

                $this->mapRef($maps, 'level', $levelData['ref_id'] ?? null, $level->id);
                $levelRequiredRefs[$level->id] = $levelData['required_request_ref'] ?? null;
                $levelNodes[$level->id] = $levelData['nodes'] ?? [];
            }
        }

        // PASS 3: investigation requests (unlocks point at evidences/levels above).
        foreach ($manifest['investigation_requests'] ?? [] as $requestData) {
            $request = InvestigationRequest::create([
                'case_id' => $case->id,
                'request_type' => $requestData['request_type'],
                'unlocks_evidence_id' => $this->lookup($maps['evidence'], $requestData['unlocks_evidence_ref'] ?? null),
                'unlocks_level_id' => $this->lookup($maps['level'], $requestData['unlocks_level_ref'] ?? null),
            ]);

            $this->mapRef($maps, 'request', $requestData['ref_id'] ?? null, $request->id);

            $request->requiredEvidences()->sync($this->lookupMany($maps['evidence'], $requestData['required_evidence_refs'] ?? []));
            $request->requiredCharacters()->sync($this->lookupMany($maps['character'], $requestData['required_character_refs'] ?? []));
        }

        // PASS 4: patch level gates now that requests exist.
        foreach ($levelRequiredRefs as $levelId => $requestRef) {
            $requestId = $this->lookup($maps['request'], $requestRef);

            if ($requestId !== null) {
                Level::whereKey($levelId)->update(['required_request_id' => $requestId]);
            }
        }

        // PASS 5: questions + choices for every level. Requirements are deferred
        // until every choice ref exists, so cross-node/cross-level requirements work.
        $pendingRequirements = [];
        $pendingPointUnlocks = [];

        foreach ($levelNodes as $levelId => $nodes) {
            $nodeIndexToQuestion = [];

            foreach ($nodes as $index => $nodeData) {
                $question = Question::create([
                    'level_id' => $levelId,
                    'order_index' => (int) ($nodeData['order_index'] ?? $index),
                    'text' => $nodeData['text'],
                    'img_url' => $this->resolve($extractDir, $nodeData['img'] ?? null, $caseData['title'], 'Levels/Questions', $storeLocally, $case->id),
                ]);

                $nodeIndexToQuestion[$index] = $question->id;
            }

            foreach ($nodes as $index => $nodeData) {
                foreach ($nodeData['choices'] ?? [] as $choiceData) {
                    $outcomes = $this->mapOutcomes($choiceData['outcomes'] ?? [], $maps, $nodeIndexToQuestion);

                    $choice = Choice::create([
                        'question_id' => $nodeIndexToQuestion[$index],
                        'text' => $choiceData['text'],
                        'outcomes' => ! empty($outcomes) ? $outcomes : null,
                        'requirements' => null,
                    ]);

                    $this->mapRef($maps, 'choice', $choiceData['ref_id'] ?? null, $choice->id);

                    if (! empty($choiceData['outcomes']['unlock_location_point_refs'])) {
                        $pendingPointUnlocks[] = [$choice, $choiceData['outcomes']['unlock_location_point_refs']];
                    }

                    if (! empty($choiceData['requirements'])) {
                        $pendingRequirements[] = [$choice, $choiceData['requirements']];
                    }
                }
            }
        }

        // PASS 6: attach requirements now that the full choice ref map exists.
        foreach ($pendingRequirements as [$choice, $requirements]) {
            $mapped = [];

            if (! empty($requirements['required_evidence_refs'])) {
                $mapped['required_evidence'] = $this->lookupMany($maps['evidence'], $requirements['required_evidence_refs']);
            }
            if (! empty($requirements['required_choice_refs'])) {
                $mapped['required_choices'] = $this->lookupMany($maps['choice'], $requirements['required_choice_refs']);
            }

            if (! empty($mapped)) {
                $choice->update(['requirements' => $mapped]);
            }
        }

        foreach ($pendingPointUnlocks as [$choice, $targetRefs]) {
            $outcomes = $choice->outcomes ?? [];
            $outcomes['unlock_location_points'] = $this->lookupMany($maps['choice'], $targetRefs);
            $choice->update(['outcomes' => $outcomes]);
        }

        return $case;
    }

    private function mapOutcomes(array $outcomes, array $maps, array $nodeIndexToQuestion): array
    {
        $mapped = [];

        if (array_key_exists('feedback', $outcomes)) {
            $mapped['feedback'] = $outcomes['feedback'];
        }

        if (array_key_exists('gives_strike', $outcomes)) {
            $mapped['gives_strike'] = (bool) $outcomes['gives_strike'];
        }

        if (array_key_exists('next_question_index', $outcomes)) {
            $mapped['next_question_id'] = $outcomes['next_question_index'] === null
                ? null
                : $nodeIndexToQuestion[$outcomes['next_question_index']];
        }

        if (! empty($outcomes['unlock_evidence_refs'])) {
            $mapped['unlock_evidence'] = $this->lookupMany($maps['evidence'], $outcomes['unlock_evidence_refs']);
        }

        if (! empty($outcomes['unlock_levels_refs'])) {
            $mapped['unlock_levels'] = $this->lookupMany($maps['level'], $outcomes['unlock_levels_refs']);
        }

        if (! empty($outcomes['character_updates']) && is_array($outcomes['character_updates'])) {
            $updates = [];

            foreach ($outcomes['character_updates'] as $update) {
                $characterId = $this->lookup($maps['character'], is_array($update) ? ($update['ref_id'] ?? null) : null);

                if ($characterId === null) {
                    continue;
                }

                $row = ['id' => $characterId];

                if (isset($update['is_unlocked'])) {
                    $row['is_unlocked'] = (bool) $update['is_unlocked'];
                }
                if (isset($update['status'])) {
                    $row['status'] = $update['status'];
                }

                $updates[] = $row;
            }

            if (! empty($updates)) {
                $mapped['character_updates'] = $updates;
            }
        }

        return $mapped;
    }

    private function resolve(
        string $extractDir,
        ?string $relPath,
        string $caseTitle,
        string $subfolder,
        bool $storeLocally,
        ?int $caseId = null,
        bool $isAudio = false
    ): ?string {
        $key = (int) $isAudio.':'.ltrim(str_replace('\\', '/', trim($relPath ?? '')), '/');

        return $this->resolvedMedia[$key] ??= $this->mediaResolver->resolve(
            $extractDir, $relPath, $caseTitle, $subfolder, $storeLocally, $caseId, $isAudio, $this->createdMedia
        );
    }

    /**
     * Register a manifest ref_id against its freshly-created database id.
     * `$maps` is typed per entity, so a collision means the manifest declared a
     * duplicate ref_id inside one registry — {@see CaseManifestValidator} must
     * have caught that pre-flight; this throw is the fail-safe so a duplicate
     * can never silently overwrite an earlier mapping (E-04).
     */
    private function mapRef(array &$maps, string $type, ?string $ref, int $id): void
    {
        if ($ref === null || $ref === '') {
            return;
        }

        if (isset($maps[$type][$ref])) {
            throw new \RuntimeException("Duplicate {$type} ref_id '{$ref}' detected during import.");
        }

        $maps[$type][$ref] = $id;
    }

    /**
     * Resolve a manifest ref to a database id. An empty ref is "no reference",
     * but a non-empty ref that is missing from the map is a broken graph — it
     * would otherwise be persisted as a dead link (E-03), so fail hard.
     * {@see CaseManifestValidator} must catch these pre-flight with a clean 422;
     * this throw is the defensive invariant.
     */
    private function lookup(array $map, ?string $ref): ?int
    {
        if ($ref === null || $ref === '') {
            return null;
        }

        if (! isset($map[$ref])) {
            throw new \RuntimeException("Unresolved reference '{$ref}' encountered during import.");
        }

        return $map[$ref];
    }

    /**
     * @return array<int, int>
     */
    private function lookupMany(array $map, array $refs): array
    {
        $ids = [];

        foreach ($refs as $ref) {
            if (! is_string($ref)) {
                throw new \RuntimeException('Non-string reference entry encountered during import.');
            }

            $ids[] = $this->lookup($map, $ref);
        }

        return $ids;
    }

    private function ensureZipExtension(): void
    {
        if (! class_exists(ZipArchive::class)) {
            throw new \RuntimeException(
                'The PHP `zip` extension is required to import a case bundle. Enable ext-zip and try again.'
            );
        }
    }
}
