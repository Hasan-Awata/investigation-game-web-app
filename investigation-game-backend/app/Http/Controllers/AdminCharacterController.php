<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\MediaService;
use App\Models\Character;
use App\Models\GameCase;
use App\Enums\CharacterStatus;
use App\Enums\CharacterCharge;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rules\Enum;

class AdminCharacterController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'is_guilty' => 'required|boolean',
            'charge' => ['nullable', new Enum(CharacterCharge::class)],
            'default_status' => ['required', new Enum(CharacterStatus::class)],
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, 'Characters', $storeLocally);

        $character = Character::create([
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => filter_var($validated['is_initial'], FILTER_VALIDATE_BOOLEAN),
            'is_guilty' => filter_var($validated['is_guilty'], FILTER_VALIDATE_BOOLEAN),
            'charge' => $validated['charge'] ?? null,
            'default_status' => $validated['default_status'],
            'img_url' => $imageUrl,
        ]);

        return response()->json(['message' => 'Character added successfully.', 'character' => $character], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $character = Character::findOrFail($id);

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'is_guilty' => 'required|boolean',
            'charge' => ['nullable', new Enum(CharacterCharge::class)],
            'default_status' => ['required', new Enum(CharacterStatus::class)],
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $updateData = [
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => filter_var($validated['is_initial'], FILTER_VALIDATE_BOOLEAN),
            'is_guilty' => filter_var($validated['is_guilty'], FILTER_VALIDATE_BOOLEAN),
            'charge' => $validated['charge'] ?? null,
            'default_status' => $validated['default_status'],
        ];

        if ($request->hasFile('image')) {
            $this->mediaService->delete($character->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->mediaService->store($request->file('image'), $caseTitle, 'Characters', $storeLocally);
        }

        $character->update($updateData);

        return response()->json(['message' => 'Character profile updated.', 'character' => $character], 200);
    }

    public function destroy($id): JsonResponse
    {
        $character = Character::findOrFail($id);
        $this->mediaService->delete($character->getRawOriginal('img_url'));
        $character->delete();
        return response()->json(['message' => 'Character deleted.'], 200);
    }
}