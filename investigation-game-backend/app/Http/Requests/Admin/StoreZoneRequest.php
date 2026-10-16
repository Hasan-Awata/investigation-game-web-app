<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreZoneRequest extends FormRequest
{
    use ZoneRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->zoneRules();
    }
}
