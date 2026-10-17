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
use App\Support\Case\CaseManifestValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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
    public function __construct(
        private readonly CaseManifestValidator $validator,
        private readonly CaseBundleMediaResolver $mediaResolver,
    ) {}

    public function import(UploadedFile $zip, bool $storeLocally): GameCase
    {
        $this->ensureZipExtension();

        $directory = 'tmp/case-bundle-'.Str::uuid();
        Storage::disk('local')->makeDirectory($directory);
        $extractDir = Storage::disk('local')->path($directory);

        try {
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
        } finally {
            Storage::disk('local')->deleteDirectory($directory);
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

        try {
            for ($i = 0; $i < $archive->numFiles; $i++) {
                $name = str_replace('\\', '/', (string) $archive->getNameIndex($i));

                if ($name === '' || str_starts_with($name, '/') || preg_match('#(^|/)\.\.(/|$)#', $name)) {
                    throw ValidationException::withMessages([
                        'file' => ["The ZIP archive contains an unsafe path: '{$name}'."],
                    ]);
                }
            }

            if (! $archive->extractTo($extractDir)) {
                throw ValidationException::withMessages([
                    'file' => ['The ZIP archive could not be extracted.'],
                ]);
            }
        } finally {
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

        $decoded = json_decode((string) file_get_contents($manifestPath), true);

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
            'map_url' => $caseData['map_url'] ?? null,
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

        $case->update([
            'img_url' => $this->resolve($extractDir, $caseData['cover'] ?? null, $caseData['title'], 'Cover', $storeLocally, $case->id),
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
            $evidence = Evidence::create([
                'case_id' => $case->id,
                'title' => $evidenceData['title'],
                'description' => $evidenceData['description'] ?? null,
                'evidence_type' => $evidenceData['evidence_type'],
                'metadata' => $evidenceData['metadata'] ?? null,
                'is_initial' => (bool) ($evidenceData['is_initial'] ?? false),
                'is_vital_for_conviction' => (bool) ($evidenceData['is_vital_for_conviction'] ?? false),
                'img_url' => $this->resolve($extractDir, $evidenceData['img'] ?? null, $caseData['title'], 'Evidences', $storeLocally, $case->id),
                'audio_url' => $this->resolve($extractDir, $evidenceData['audio'] ?? null, $caseData['title'], 'Evidences', $storeLocally, $case->id),
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

        foreach ($levelNodes as $levelId => $nodes) {
            $nodeIndexToQuestion = [];

            foreach ($nodes as $index => $nodeData) {
                $question = Question::create([
                    'level_id' => $levelId,
                    'order_index' => (int) ($nodeData['order_index'] ?? $index),
                    'text' => $nodeData['text'],
                    'img_url' => $this->resolve($extractDir, $nodeData['img'] ?? null, $caseData['title'], 'Levels/Questions', $storeLocally, $case->id),
                    'audio_url' => $this->resolve($extractDir, $nodeData['audio'] ?? null, $caseData['title'], 'Levels/Questions', $storeLocally, $case->id),
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

        if (isset($outcomes['next_question_index'])) {
            $mapped['next_question_id'] = $nodeIndexToQuestion[$outcomes['next_question_index']] ?? null;
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

                if (array_key_exists('is_unlocked', $update)) {
                    $row['is_unlocked'] = (bool) $update['is_unlocked'];
                }
                if (array_key_exists('status', $update)) {
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
        ?int $caseId = null
    ): ?string {
        return $this->mediaResolver->resolve($extractDir, $relPath, $caseTitle, $subfolder, $storeLocally, $caseId);
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
