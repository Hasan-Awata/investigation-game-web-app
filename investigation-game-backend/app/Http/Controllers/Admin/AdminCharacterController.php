<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCharacterRequest;
use App\Http\Requests\Admin\UpdateCharacterRequest;
use App\Models\Character;
use App\Models\GameCase;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminCharacterController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(StoreCharacterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $gameCase = GameCase::find($validated['case_id']);
        $caseTitle = $gameCase?->title ?? 'General';

        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, 'Characters', $storeLocally, $gameCase?->id);

        $character = DB::transaction(fn () => Character::create([
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => $request->boolean('is_initial'),
            'is_guilty' => $request->boolean('is_guilty'),
            'charge' => $validated['charge'] ?? null,
            'default_status' => $validated['default_status'],
            'img_url' => $imageUrl,
        ]));

        return response()->json(['message' => 'Character added successfully.', 'character' => $character], 201);
    }

    public function update(UpdateCharacterRequest $request, Character $character): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $gameCase = GameCase::find($validated['case_id']);
        $caseTitle = $gameCase?->title ?? 'General';

        $oldImage = $character->getRawOriginal('img_url');
        $newImage = $request->hasFile('image')
            ? $this->mediaService->store($request->file('image'), $caseTitle, 'Characters', $storeLocally, $gameCase?->id)
            : null;

        $updateData = [
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => $request->boolean('is_initial'),
            'is_guilty' => $request->boolean('is_guilty'),
            'charge' => $validated['charge'] ?? null,
            'default_status' => $validated['default_status'],
        ];

        if ($newImage !== null) {
            $updateData['img_url'] = $newImage;
        }

        DB::transaction(fn () => $character->update($updateData));

        if ($newImage !== null && $newImage !== $oldImage) {
            $this->mediaService->delete($oldImage);
        }

        return response()->json(['message' => 'Character profile updated.', 'character' => $character], 200);
    }

    public function destroy(Character $character): JsonResponse
    {
        $image = $character->getRawOriginal('img_url');

        DB::transaction(fn () => $character->delete());

        $this->mediaService->delete($image);

        return response()->json(['message' => 'Character deleted.'], 200);
    }
}
