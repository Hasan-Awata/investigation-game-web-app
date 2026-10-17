<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLevelRequest;
use App\Http\Requests\Admin\UpdateLevelRequest;
use App\Models\Level;
use App\Models\Zone;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminLevelController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(StoreLevelRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $gameCase = Zone::with('gameCase')->find($validated['zone_id'])?->gameCase;
        $caseTitle = $gameCase?->title ?? 'General';

        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, 'Levels', $storeLocally, $gameCase?->id);

        $level = DB::transaction(fn () => Level::create([
            'zone_id' => $validated['zone_id'],
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'is_initial' => $request->boolean('is_initial'),
            'presentation_type' => $validated['presentation_type'],
            'required_request_id' => $validated['required_request_id'] ?? null,
            'img_url' => $imageUrl,
        ]));

        return response()->json(['message' => 'Level created successfully.', 'level' => $level], 201);
    }

    public function update(UpdateLevelRequest $request, Level $level): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $gameCase = Zone::with('gameCase')->find($validated['zone_id'])?->gameCase;
        $caseTitle = $gameCase?->title ?? 'General';

        $oldImage = $level->getRawOriginal('img_url');
        $newImage = $request->hasFile('image')
            ? $this->mediaService->store($request->file('image'), $caseTitle, 'Levels', $storeLocally, $gameCase?->id)
            : null;

        $updateData = [
            'zone_id' => $validated['zone_id'],
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'is_initial' => $request->boolean('is_initial'),
            'presentation_type' => $validated['presentation_type'],
            'required_request_id' => $validated['required_request_id'] ?? null,
        ];

        if ($newImage !== null) {
            $updateData['img_url'] = $newImage;
        }

        DB::transaction(fn () => $level->update($updateData));

        if ($newImage !== null && $newImage !== $oldImage) {
            $this->mediaService->delete($oldImage);
        }

        return response()->json(['message' => 'Level updated successfully.', 'level' => $level], 200);
    }

    public function destroy(Level $level): JsonResponse
    {
        $image = $level->getRawOriginal('img_url');

        DB::transaction(fn () => $level->delete());

        $this->mediaService->delete($image);

        return response()->json(['message' => 'Level deleted.'], 200);
    }

    public function indexByZone(Zone $zone): JsonResponse
    {
        $levels = Level::with(['questions.choices'])
            ->where('zone_id', $zone->id)
            ->orderBy('order_index', 'asc')
            ->get();

        return response()->json($levels, 200);
    }
}
