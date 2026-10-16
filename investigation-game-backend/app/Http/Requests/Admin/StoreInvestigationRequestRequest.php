<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvestigationRequestRequest extends FormRequest
{
    use InvestigationRequestRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->investigationRequestRules();
    }

    public function after(): array
    {
        return $this->investigationRequestAfter();
    }
}
