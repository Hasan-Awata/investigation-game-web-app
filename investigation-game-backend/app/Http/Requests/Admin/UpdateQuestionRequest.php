<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionRequest extends FormRequest
{
    use QuestionRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->questionRules();
    }
}
