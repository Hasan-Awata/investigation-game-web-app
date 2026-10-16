<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCaseRequest extends FormRequest
{
    use CaseRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->caseRules();
    }
}
