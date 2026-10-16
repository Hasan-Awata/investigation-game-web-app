<?php

namespace App\Support\Case;

use App\Enums\CharacterCharge;
use App\Enums\CharacterStatus;
use App\Enums\EvidenceType;
use App\Enums\InvestigationRequestType;
use App\Rules\EvidenceMetadataMatchesType;
use App\Services\Case\CaseBundleMediaResolver;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\ValidationException;

/**
 * Validates the `case.json` manifest of a case bundle before any database writes
 * happen, so malformed imports always yield a clean 422 instead of a 500.
 *
 * Structural rules run through Laravel's validator; media-path existence, the
 * banned zone `map_url`, and a few cross-entity rules are checked manually so
 * we can emit precise field paths.
 */
class CaseManifestValidator
{
    public function __construct(private readonly CaseBundleMediaResolver $resolver) {}

    /**
     * @return array<int, string> Non-fatal warnings (e.g. unresolved refs).
     *
     * @throws ValidationException
     */
    public function validate(array $manifest, string $extractDir): array
    {
        $validator = Validator::make($manifest, $this->rules());

        $errors = $validator->errors()->toArray();

        $errors = array_merge_recursive($errors, $this->validateZoneMapUrls($manifest));
        $errors = array_merge_recursive($errors, $this->validateEvidenceMetadata($manifest));
        $errors = array_merge_recursive($errors, $this->validateMediaPaths($manifest, $extractDir));
        $errors = array_merge_recursive($errors, $this->validateChoiceTextUniqueness($manifest));

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        return $this->collectRefWarnings($manifest);
    }

    private function rules(): array
    {
        return [
            'format_version' => ['required', 'integer', 'in:1'],

            'case' => ['required', 'array'],
            'case.title' => ['required', 'string', 'max:255'],
            'case.story' => ['required', 'string'],
            'case.map_url' => ['nullable', 'string'],
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
            'zones.*.levels.*.presentation_type' => ['required', Rule::in(['interrogation', 'location', 'wiretap'])],
            'zones.*.levels.*.required_request_ref' => ['nullable', 'string'],
            'zones.*.levels.*.img' => ['nullable', 'string'],
            'zones.*.levels.*.nodes' => ['nullable', 'array'],
            'zones.*.levels.*.nodes.*' => ['array'],
            'zones.*.levels.*.nodes.*.text' => ['required', 'string'],
            'zones.*.levels.*.nodes.*.img' => ['nullable', 'string'],
            'zones.*.levels.*.nodes.*.audio' => ['nullable', 'string'],
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

            $rule = new EvidenceMetadataMatchesType;
            $rule->setData(['evidence_type' => $type]);

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

        $check = function (string $field, $value) use (&$errors, $extractDir) {
            if ($value === null || $value === '') {
                return;
            }

            if (! is_string($value) || $this->resolver->absolutePath($extractDir, $value) === null) {
                $errors[$field][] = "Media path '{$value}' does not resolve to a file inside the bundle.";
            }
        };

        $check('case.cover', $manifest['case']['cover'] ?? null);

        foreach ($manifest['evidences'] ?? [] as $i => $evidence) {
            if (! is_array($evidence)) {
                continue;
            }
            $check("evidences.{$i}.img", $evidence['img'] ?? null);
            $check("evidences.{$i}.audio", $evidence['audio'] ?? null);
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
                    $check("zones.{$z}.levels.{$l}.nodes.{$n}.audio", $node['audio'] ?? null);
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
     * Unknown/mistyped refs are dropped at import time (matching existing
     * behaviour); here we surface them as warnings so authors can fix them.
     */
    private function collectRefWarnings(array $manifest): array
    {
        $refs = [
            'evidence' => [],
            'character' => [],
            'level' => [],
            'request' => [],
            'choice' => [],
        ];

        foreach ($manifest['evidences'] ?? [] as $evidence) {
            if (is_array($evidence) && ! empty($evidence['ref_id'])) {
                $refs['evidence'][$evidence['ref_id']] = true;
            }
        }
        foreach ($manifest['characters'] ?? [] as $character) {
            if (is_array($character) && ! empty($character['ref_id'])) {
                $refs['character'][$character['ref_id']] = true;
            }
        }
        foreach ($manifest['investigation_requests'] ?? [] as $request) {
            if (is_array($request) && ! empty($request['ref_id'])) {
                $refs['request'][$request['ref_id']] = true;
            }
        }
        foreach ($manifest['zones'] ?? [] as $zone) {
            foreach ($zone['levels'] ?? [] as $level) {
                if (! empty($level['ref_id'])) {
                    $refs['level'][$level['ref_id']] = true;
                }
                foreach ($level['nodes'] ?? [] as $node) {
                    foreach ($node['choices'] ?? [] as $choice) {
                        if (! empty($choice['ref_id'])) {
                            $refs['choice'][$choice['ref_id']] = true;
                        }
                    }
                }
            }
        }

        $warnings = [];
        $warn = function (string $type, $ref) use (&$warnings, $refs) {
            if (is_string($ref) && $ref !== '' && ! isset($refs[$type][$ref])) {
                $warnings[] = "Unresolved {$type} reference '{$ref}' was dropped.";
            }
        };

        foreach ($manifest['investigation_requests'] ?? [] as $request) {
            $warn('evidence', $request['unlocks_evidence_ref'] ?? null);
            $warn('level', $request['unlocks_level_ref'] ?? null);
            foreach ($request['required_evidence_refs'] ?? [] as $ref) {
                $warn('evidence', $ref);
            }
            foreach ($request['required_character_refs'] ?? [] as $ref) {
                $warn('character', $ref);
            }
        }

        foreach ($manifest['zones'] ?? [] as $zone) {
            foreach ($zone['levels'] ?? [] as $level) {
                $warn('request', $level['required_request_ref'] ?? null);

                foreach ($level['nodes'] ?? [] as $node) {
                    foreach ($node['choices'] ?? [] as $choice) {
                        $outcomes = $choice['outcomes'] ?? [];
                        foreach ($outcomes['unlock_evidence_refs'] ?? [] as $ref) {
                            $warn('evidence', $ref);
                        }
                        foreach ($outcomes['unlock_levels_refs'] ?? [] as $ref) {
                            $warn('level', $ref);
                        }
                        foreach ($outcomes['character_updates'] ?? [] as $update) {
                            $warn('character', is_array($update) ? ($update['ref_id'] ?? null) : null);
                        }

                        $requirements = $choice['requirements'] ?? [];
                        foreach ($requirements['required_evidence_refs'] ?? [] as $ref) {
                            $warn('evidence', $ref);
                        }
                        foreach ($requirements['required_choice_refs'] ?? [] as $ref) {
                            $warn('choice', $ref);
                        }
                    }
                }
            }
        }

        foreach (array_unique($warnings) as $warning) {
            Log::warning("[CaseBundle] {$warning}");
        }

        return array_values(array_unique($warnings));
    }
}
