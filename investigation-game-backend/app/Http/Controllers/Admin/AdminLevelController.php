<?php

namespace App\Http\Controllers\Admin;

use App\Enums\LevelPresentationType;
use App\Http\Controllers\Controller;
use App\Models\Level;
use App\Models\Zone;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class AdminLevelController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
            'title' => 'required|string|max:255',
            'details' => 'required|string',
            'order_index' => 'required|integer|min:1',
            'presentation_type' => ['required', new Enum(LevelPresentationType::class)],
            'required_request_id' => 'nullable|exists:investigation_requests,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = Zone::with('gameCase')->where('id', $validated['zone_id'])->first()?->gameCase?->title ?? 'General';
        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, 'Levels', $storeLocally);

        $level = Level::create([
            'zone_id' => $validated['zone_id'],
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'is_initial' => filter_var($request->is_initial, FILTER_VALIDATE_BOOLEAN),
            'presentation_type' => $validated['presentation_type'],
            'required_request_id' => $validated['required_request_id'] ?? null,
            'img_url' => $imageUrl,
        ]);

        return response()->json(['message' => 'Level created successfully.', 'level' => $level], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $level = Level::findOrFail($id);

        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
            'title' => 'required|string|max:255',
            'details' => 'required|string',
            'order_index' => 'required|integer|min:1',
            'presentation_type' => ['required', new Enum(LevelPresentationType::class)],
            'required_request_id' => 'nullable|exists:investigation_requests,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = Zone::with('gameCase')->where('id', $validated['zone_id'])->first()?->gameCase?->title ?? 'General';

        $updateData = [
            'zone_id' => $validated['zone_id'],
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'is_initial' => filter_var($request->is_initial, FILTER_VALIDATE_BOOLEAN),
            'presentation_type' => $validated['presentation_type'],
            'required_request_id' => $validated['required_request_id'] ?? null,
        ];

        if ($request->hasFile('image')) {
            $this->mediaService->delete($level->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->mediaService->store($request->file('image'), $caseTitle, 'Levels', $storeLocally);
        }

        $level->update($updateData);

        return response()->json(['message' => 'Level updated successfully.', 'level' => $level], 200);
    }

    public function destroy($id): JsonResponse
    {
        $level = Level::findOrFail($id);
        $this->mediaService->delete($level->getRawOriginal('img_url'));
        $level->delete();

        return response()->json(['message' => 'Level deleted.'], 200);
    }

    public function indexByZone($zoneId): JsonResponse
    {
        $levels = Level::with(['questions.choices'])
            ->where('zone_id', $zoneId)
            ->orderBy('order_index', 'asc')
            ->get();

        return response()->json($levels, 200);
    }
}
