<?php

namespace App\Support\Case;

use App\Enums\CharacterCharge;
use App\Enums\CharacterStatus;
use App\Enums\EvidenceType;
use App\Enums\InvestigationRequestType;
use App\Rules\EvidenceMetadataMatchesType;
use App\Services\Case\CaseBundleMediaResolver;
use App\Services\MediaService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\ValidationException;

/**
 * Validates the `case.json` manifest of a case bundle before any database writes
 * happen, so malformed imports always yield a clean 422 instead of a 500.
 *
 * Validation is exhaustive: structural rules, metadata envelopes, media paths,
 * duplicate `ref_id`s, and all cross-`*_ref` resolution are accumulated across
 * every entity in a single pass, and any failure throws one `ValidationException`
 * carrying errors keyed by their exact manifest dot-path. Nothing is a warning;
 * an import that reaches the database has already passed every check.
 */
class CaseManifestValidator
{
    public function __construct(
        private readonly CaseBundleMediaResolver $resolver,
        private readonly MediaService $mediaService,
    ) {}

    /**
     * Collect all per-entity manifest errors before persistence; imports remain atomic at the database layer.
     *
     * @throws ValidationException With every error across the whole manifest keyed by its exact dot-path.
     */
    public function validate(array $manifest, string $extractDir): void
    {
        $validator = Validator::make($manifest, $this->rules());

        $errors = $validator->errors()->toArray();
        $errors = array_merge_recursive($errors, $this->validateLegacyMapUrl($manifest));
        $errors = array_merge_recursive($errors, $this->validateZoneMapUrls($manifest));
        $errors = array_merge_recursive($errors, $this->validateEvidenceMetadata($manifest));
        $errors = array_merge_recursive($errors, $this->validateMediaPaths($manifest, $extractDir));
        $errors = array_merge_recursive($errors, $this->validateChoiceTextUniqueness($manifest));

        $refs = $this->buildRefRegistries($manifest, $errors);
        $errors = array_merge_recursive($errors, $this->validateCrossReferences($manifest, $refs));

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function rules(): array
    {
        return [
            'format_version' => ['required', 'integer', 'in:1'],

            'case' => ['required', 'array'],
            'case.title' => ['required', 'string', 'max:255'],
            'case.story' => ['required', 'string'],
            'case.map' => ['nullable', 'string'],
            'case.cover' => ['nullable', 'string'],
            'case.min_player_XP' => ['nullable', 'integer', 'min:0'],
            'case.XP_on_solve' => ['required', 'integer', 'min:0'],
            'case.max_strikes' => ['nullable', 'integer', 'min:1'],
            'case.rating_stars' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'case.age_rating' => ['nullable', 'string', 'max:50'],
            'case.estimated_playtime' => ['nullable', 'string', 'max:100'],
            'case.difficulty' => ['nullable', 'string', 'max:50'],
            'case.tags' => ['nullable', 'array'],
            'case.tags.*' => ['string'],
            'case.author_name' => ['nullable', 'string', 'max:100'],
            'case.is_published' => ['nullable', 'boolean'],

            'evidences' => ['nullable', 'array'],
            'evidences.*' => ['array'],
            'evidences.*.title' => ['required', 'string', 'max:255'],
            'evidences.*.evidence_type' => ['required', new Enum(EvidenceType::class)],
            'evidences.*.is_initial' => ['nullable', 'boolean'],
            'evidences.*.is_vital_for_conviction' => ['nullable', 'boolean'],
            'evidences.*.img' => ['nullable', 'string'],
            'evidences.*.audio' => ['nullable', 'string'],

            'characters' => ['nullable', 'array'],
            'characters.*' => ['array'],
            'characters.*.name' => ['required', 'string', 'max:255'],
            'characters.*.default_status' => ['nullable', new Enum(CharacterStatus::class)],
            'characters.*.charge' => ['nullable', new Enum(CharacterCharge::class)],
            'characters.*.img' => ['nullable', 'string'],

            'investigation_requests' => ['nullable', 'array'],
            'investigation_requests.*' => ['array'],
            'investigation_requests.*.request_type' => ['required', new Enum(InvestigationRequestType::class)],
            'investigation_requests.*.unlocks_evidence_ref' => ['nullable', 'string'],
            'investigation_requests.*.unlocks_level_ref' => ['nullable', 'string'],
            'investigation_requests.*.required_evidence_refs' => ['nullable', 'array'],
            'investigation_requests.*.required_character_refs' => ['nullable', 'array'],

            'zones' => ['nullable', 'array'],
            'zones.*' => ['array'],
            'zones.*.title' => ['required', 'string', 'max:255'],
            'zones.*.order_index' => ['required', 'integer', 'min:1'],
            'zones.*.coord_x' => ['nullable', 'numeric'],
            'zones.*.coord_y' => ['nullable', 'numeric'],
            'zones.*.levels' => ['nullable', 'array'],
            'zones.*.levels.*' => ['array'],
            'zones.*.levels.*.title' => ['required', 'string', 'max:255'],
            'zones.*.levels.*.details' => ['required', 'string'],
            'zones.*.levels.*.order_index' => ['required', 'integer', 'min:1'],
            'zones.*.levels.*.is_initial' => ['nullable', 'boolean'],
            'zones.*.levels.*.presentation_type' => ['required', Rule::in(['interrogation', 'location'])],
            'zones.*.levels.*.required_request_ref' => ['nullable', 'string'],
            'zones.*.levels.*.img' => ['nullable', 'string'],
            'zones.*.levels.*.nodes' => ['nullable', 'array'],
            'zones.*.levels.*.nodes.*' => ['array'],
            'zones.*.levels.*.nodes.*.order_index' => ['nullable', 'integer', 'min:0'],
            'zones.*.levels.*.nodes.*.text' => ['required', 'string'],
            'zones.*.levels.*.nodes.*.img' => ['nullable', 'string'],
            'zones.*.levels.*.nodes.*.choices' => ['nullable', 'array'],
            'zones.*.levels.*.nodes.*.choices.*' => ['array'],
            'zones.*.levels.*.nodes.*.choices.*.text' => ['required', 'string', 'max:255'],
            'zones.*.levels.*.nodes.*.choices.*.outcomes' => ['nullable', 'array'],
            'zones.*.levels.*.nodes.*.choices.*.requirements' => ['nullable', 'array'],
        ];
    }

    private function validateZoneMapUrls(array $manifest): array
    {
        $errors = [];

        foreach ($manifest['zones'] ?? [] as $z => $zone) {
            if (is_array($zone) && array_key_exists('map_url', $zone)) {
                $errors["zones.{$z}.map_url"][] = 'Zones must not carry a map_url; the map belongs to the case.';
            }
        }

        return $errors;
    }

    private function validateLegacyMapUrl(array $manifest): array
    {
        $mapUrl = $manifest['case']['map_url'] ?? null;

        if (! is_string($mapUrl) || trim($mapUrl) === '') {
            return [];
        }

        return [
            'case.map_url' => ['Legacy map_url references are no longer supported. Add the map image to the bundle and set case.map to its media path.'],
        ];
    }

    private function validateEvidenceMetadata(array $manifest): array
    {
        $errors = [];

        foreach ($manifest['evidences'] ?? [] as $i => $evidence) {
            if (! is_array($evidence)) {
                continue;
            }

            $type = $evidence['evidence_type'] ?? null;
            if (! $type) {
                continue;
            }

            $rule = new EvidenceMetadataMatchesType($type);

            $validator = Validator::make(
                ['metadata' => $evidence['metadata'] ?? null],
                ['metadata' => ['nullable', $rule]]
            );

            foreach ($validator->errors()->get('metadata') as $message) {
                $errors["evidences.{$i}.metadata"][] = $message;
            }
        }

        return $errors;
    }

    private function validateMediaPaths(array $manifest, string $extractDir): array
    {
        $errors = [];

        $check = function (string $field, mixed $value, bool $isAudio = false) use (&$errors, $extractDir): void {
            if ($value === null || $value === '') {
                return;
            }

            if (! is_string($value)) {
                $errors[$field][] = 'The media path must be a string.';

                return;
            }

            $absolutePath = $this->resolver->absolutePath($extractDir, $value);

            if ($absolutePath === null) {
                $errors[$field][] = "Media path '{$value}' does not resolve to a file inside the bundle.";

                return;
            }

            try {
                $this->mediaService->validateFromPath($absolutePath, basename($absolutePath), $isAudio, $field);
            } catch (ValidationException $exception) {
                $errors = array_merge_recursive($errors, $exception->errors());
            }
        };

        $check('case.cover', $manifest['case']['cover'] ?? null);
        $check('case.map', $manifest['case']['map'] ?? null);

        foreach ($manifest['evidences'] ?? [] as $i => $evidence) {
            if (! is_array($evidence)) {
                continue;
            }
            $check("evidences.{$i}.img", $evidence['img'] ?? null);
            $check("evidences.{$i}.audio", $evidence['audio'] ?? null, isAudio: true);
        }

        foreach ($manifest['characters'] ?? [] as $i => $character) {
            if (! is_array($character)) {
                continue;
            }
            $check("characters.{$i}.img", $character['img'] ?? null);
        }

        foreach ($manifest['zones'] ?? [] as $z => $zone) {
            if (! is_array($zone)) {
                continue;
            }

            foreach ($zone['levels'] ?? [] as $l => $level) {
                if (! is_array($level)) {
                    continue;
                }

                $check("zones.{$z}.levels.{$l}.img", $level['img'] ?? null);

                foreach ($level['nodes'] ?? [] as $n => $node) {
                    if (! is_array($node)) {
                        continue;
                    }
                    $check("zones.{$z}.levels.{$l}.nodes.{$n}.img", $node['img'] ?? null);
                }
            }
        }

        return $errors;
    }

    private function validateChoiceTextUniqueness(array $manifest): array
    {
        $errors = [];

        foreach ($manifest['zones'] ?? [] as $z => $zone) {
            foreach ($zone['levels'] ?? [] as $l => $level) {
                foreach ($level['nodes'] ?? [] as $n => $node) {
                    $seen = [];

                    foreach ($node['choices'] ?? [] as $c => $choice) {
                        $text = is_array($choice) ? ($choice['text'] ?? null) : null;

                        if ($text === null) {
                            continue;
                        }

                        if (isset($seen[$text])) {
                            $errors["zones.{$z}.levels.{$l}.nodes.{$n}.choices.{$c}.text"][] =
                                'Choice text must be unique within a node.';
                        }

                        $seen[$text] = true;
                    }
                }
            }
        }

        return $errors;
    }

    /**
     * Walk every entity that declares a `ref_id`, building the per-type
     * registries used for cross-reference resolution. A `ref_id` that appears
     * twice inside the same registry is recorded as an error at the second
     * declaration path (E-04), so duplicate ids can never overwrite each other
     * during import.
     *
     * @param  array<int, array<int, string>>  $errors  Error bag, mutated in place.
     * @return array<string, array<string, string>> Map of entity type => ref_id => first declaration path.
     */
    private function buildRefRegistries(array $manifest, array &$errors): array
    {
        $refs = [
            'evidence' => [],
            'character' => [],
            'level' => [],
            'request' => [],
            'choice' => [],
            'location_choice' => [],
        ];

        $register = function ($entity, string $path, string $type) use (&$refs, &$errors) {
            $refId = is_array($entity) ? ($entity['ref_id'] ?? null) : null;

            if (! is_string($refId) || $refId === '') {
                return;
            }

            if (isset($refs[$type][$refId])) {
                $errors["{$path}.ref_id"][] = "Duplicate ref_id '{$refId}' already declared at {$refs[$type][$refId]}.";

                return;
            }

            $refs[$type][$refId] = "{$path}.ref_id";
        };

        foreach ($manifest['evidences'] ?? [] as $i => $evidence) {
            $register($evidence, "evidences.{$i}", 'evidence');
        }

        foreach ($manifest['characters'] ?? [] as $i => $character) {
            $register($character, "characters.{$i}", 'character');
        }

        foreach ($manifest['investigation_requests'] ?? [] as $i => $request) {
            $register($request, "investigation_requests.{$i}", 'request');
        }

        foreach ($manifest['zones'] ?? [] as $z => $zone) {
            if (! is_array($zone)) {
                continue;
            }

            foreach ($zone['levels'] ?? [] as $l => $level) {
                if (! is_array($level)) {
                    continue;
                }

                $register($level, "zones.{$z}.levels.{$l}", 'level');

                foreach ($level['nodes'] ?? [] as $n => $node) {
                    if (! is_array($node)) {
                        continue;
                    }

                    foreach ($node['choices'] ?? [] as $c => $choice) {
                        $register($choice, "zones.{$z}.levels.{$l}.nodes.{$n}.choices.{$c}", 'choice');
                        if (($level['presentation_type'] ?? null) === 'location'
                            && is_array($choice)
                            && preg_match('/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\|.+$/u', (string) ($choice['text'] ?? '')) === 1) {
                            $register($choice, "zones.{$z}.levels.{$l}.nodes.{$n}.choices.{$c}", 'location_choice');
                        }
                    }
                }
            }
        }

        return $refs;
    }

    /**
     * Verify every cross-`*_ref` in the manifest resolves to the entity it
     * names. Unresolved references are hard validation errors keyed by their
     * exact JSON path (E-03) — never warnings — because a dropped link would
     * otherwise persist as a broken choice, request, or level gate.
     *
     * @param  array<string, array<string, string>>  $refs
     * @return array<int, array<int, string>>
     */
    private function validateCrossReferences(array $manifest, array $refs): array
    {
        $errors = [];

        $check = function ($ref, string $type, string $path) use (&$errors, $refs) {
            if ($ref === null) {
                return;
            }

            if (! is_string($ref) || $ref === '') {
                $errors[$path][] = "The {$type} reference at '{$path}' must be a non-empty string.";

                return;
            }

            if (! isset($refs[$type][$ref])) {
                $errors[$path][] = "Unresolved {$type} reference '{$ref}'.";
            }
        };

        foreach ($manifest['investigation_requests'] ?? [] as $i => $request) {
            if (! is_array($request)) {
                continue;
            }

            $base = "investigation_requests.{$i}";

            $check($request['unlocks_evidence_ref'] ?? null, 'evidence', "{$base}.unlocks_evidence_ref");
            $check($request['unlocks_level_ref'] ?? null, 'level', "{$base}.unlocks_level_ref");

            foreach ($request['required_evidence_refs'] ?? [] as $j => $ref) {
                $check($ref, 'evidence', "{$base}.required_evidence_refs.{$j}");
            }
            foreach ($request['required_character_refs'] ?? [] as $j => $ref) {
                $check($ref, 'character', "{$base}.required_character_refs.{$j}");
            }
        }

        foreach ($manifest['zones'] ?? [] as $z => $zone) {
            if (! is_array($zone)) {
                continue;
            }

            foreach ($zone['levels'] ?? [] as $l => $level) {
                if (! is_array($level)) {
                    continue;
                }

                $levelBase = "zones.{$z}.levels.{$l}";

                $check($level['required_request_ref'] ?? null, 'request', "{$levelBase}.required_request_ref");

                foreach ($level['nodes'] ?? [] as $n => $node) {
                    if (! is_array($node)) {
                        continue;
                    }

                    foreach ($node['choices'] ?? [] as $c => $choice) {
                        if (! is_array($choice)) {
                            continue;
                        }

                        $choiceBase = "{$levelBase}.nodes.{$n}.choices.{$c}";
                        $outcomes = is_array($choice['outcomes'] ?? null) ? $choice['outcomes'] : [];
                        $requirements = is_array($choice['requirements'] ?? null) ? $choice['requirements'] : [];

                        foreach ($outcomes['unlock_evidence_refs'] ?? [] as $j => $ref) {
                            $check($ref, 'evidence', "{$choiceBase}.outcomes.unlock_evidence_refs.{$j}");
                        }
                        foreach ($outcomes['unlock_levels_refs'] ?? [] as $j => $ref) {
                            $check($ref, 'level', "{$choiceBase}.outcomes.unlock_levels_refs.{$j}");
                        }
                        foreach ($outcomes['unlock_location_point_refs'] ?? [] as $j => $ref) {
                            $check($ref, 'location_choice', "{$choiceBase}.outcomes.unlock_location_point_refs.{$j}");
                        }
                        foreach ($outcomes['character_updates'] ?? [] as $k => $update) {
                            if (is_array($update) && array_key_exists('ref_id', $update)) {
                                $check($update['ref_id'], 'character', "{$choiceBase}.outcomes.character_updates.{$k}.ref_id");
                            }
                        }
                        foreach ($requirements['required_evidence_refs'] ?? [] as $j => $ref) {
                            $check($ref, 'evidence', "{$choiceBase}.requirements.required_evidence_refs.{$j}");
                        }
                        foreach ($requirements['required_choice_refs'] ?? [] as $j => $ref) {
                            $check($ref, 'choice', "{$choiceBase}.requirements.required_choice_refs.{$j}");
                        }
                    }
                }
            }
        }

        return $errors;
    }
}
