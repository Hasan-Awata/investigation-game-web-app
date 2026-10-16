<?php

namespace App\Http\Requests\Admin;

use App\Enums\InvestigationRequestType;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rules\Enum;

trait InvestigationRequestRequestTrait
{
    protected function investigationRequestRules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'request_type' => ['required', new Enum(InvestigationRequestType::class)],
            'unlocks_evidence_id' => ['nullable', 'exists:evidences,id'],
            'unlocks_level_id' => ['nullable', 'exists:levels,id'],
            'required_evidence_ids' => ['nullable', 'array'],
            'required_evidence_ids.*' => ['exists:evidences,id'],
            'required_character_ids' => ['nullable', 'array'],
            'required_character_ids.*' => ['exists:characters,id'],
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

                $requiredCount = count((array) ($data['required_evidence_ids'] ?? []))
                    + count((array) ($data['required_character_ids'] ?? []));

                if ($requiredCount < 2) {
                    $validator->errors()->add(
                        'required_evidence_ids',
                        'A request must require at least two items in total (evidences and/or characters).'
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
}
