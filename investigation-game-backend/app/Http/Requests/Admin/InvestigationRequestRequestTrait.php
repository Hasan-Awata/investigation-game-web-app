<?php

namespace App\Http\Requests\Admin;

use App\Enums\InvestigationRequestType;
use App\Models\InvestigationRequest;
use App\Models\Level;
use Closure;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Rules\Exists;

trait InvestigationRequestRequestTrait
{
    /**
     * Case that every related entity (unlocks, required items) must belong to:
     * the requested one for Store/Update, or the target's current one when
     * case_id is not being changed.
     */
    protected function resolveTargetCaseId(): ?int
    {
        if ($this->filled('case_id')) {
            return (int) $this->input('case_id');
        }

        $model = $this->route('investigation_request') ?? $this->route('request');

        if ($model instanceof InvestigationRequest) {
            return (int) $model->case_id;
        }

        if (is_numeric($model)) {
            return (int) InvestigationRequest::whereKey($model)->value('case_id');
        }

        return null;
    }

    protected function investigationRequestRules(): array
    {
        $caseId = $this->resolveTargetCaseId();

        return [
            'case_id' => ['required', 'exists:cases,id'],
            'request_type' => ['required', new Enum(InvestigationRequestType::class)],
            'unlocks_evidence_id' => ['nullable', 'integer', $this->caseScopedExistsRule('evidences', $caseId)],
            'unlocks_level_id' => ['nullable', 'integer', $this->levelInCaseRule($caseId)],
            'required_evidence_ids' => ['nullable', 'array'],
            'required_evidence_ids.*' => ['integer', $this->caseScopedExistsRule('evidences', $caseId)],
            'required_character_ids' => ['nullable', 'array'],
            'required_character_ids.*' => ['integer', $this->caseScopedExistsRule('characters', $caseId)],
        ];
    }

    /**
     * Cross-field rules that cannot be expressed as per-attribute rules:
     * a request must require at least two items and must unlock something.
     *
     * @return array<int, callable>
     */
    protected function investigationRequestAfter(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $data = $validator->getData();

                $requiredEvidenceIds = (array) ($data['required_evidence_ids'] ?? []);
                $requiredCharacterIds = (array) ($data['required_character_ids'] ?? []);

                if (!InvestigationRequest::hasMinimumItems(count($requiredEvidenceIds), count($requiredCharacterIds))) {
                    $validator->errors()->add(
                        'required_evidence_ids',
                        InvestigationRequest::MIN_ITEMS_MESSAGE
                    );
                }

                if (empty($data['unlocks_evidence_id']) && empty($data['unlocks_level_id'])) {
                    $validator->errors()->add(
                        'unlocks_evidence_id',
                        'A request must unlock either an evidence or a level.'
                    );
                }
            },
        ];
    }

    private function caseScopedExistsRule(string $table, ?int $caseId): Exists
    {
        return Rule::exists($table, 'id')->where(
            fn ($query) => $caseId ? $query->where('case_id', $caseId) : $query
        );
    }

    private function levelInCaseRule(?int $caseId): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($caseId): void {
            $inCase = Level::whereKey($value)
                ->when($caseId, fn ($query) => $query->whereHas(
                    'zone',
                    fn ($zone) => $zone->where('case_id', $caseId)
                ))
                ->exists();

            if (!$inCase) {
                $fail('The selected ' . $attribute . ' must belong to the target case.');
            }
        };
    }
}
