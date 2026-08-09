<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Traits\HandlesMedia;
use App\Models\Level;
use App\Models\Phase;
use App\Enums\LevelPresentationType; 
use Illuminate\Validation\Rules\Enum; 
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminLevelController extends Controller
{
    use HandlesMedia;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phase_id' => 'required|exists:phases,id', 
            'title' => 'required|string|max:255',
            'details' => 'required|string',
            'order_index' => 'required|integer|min:1',
            'presentation_type' => ['required', new Enum(LevelPresentationType::class)], 
            'required_request_id' => 'nullable|exists:investigation_requests,id',          
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);

        // Fetch the parent case title through the phase relationship to build the folder slug
        $caseTitle = Phase::with('gameCase')->where('id', $validated['phase_id'])->first()?->gameCase?->title ?? 'General';

        $imageUrl = $this->storeMedia($request->file('image'), $caseTitle, 'Levels', $storeLocally);

        $level = Level::create([
            'phase_id' => $validated['phase_id'], 
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'is_initial' => filter_var($request->is_initial, FILTER_VALIDATE_BOOLEAN),
            'presentation_type' => $validated['presentation_type'], 
            'required_request_id' => $validated['required_request_id'] ?? null,
            'img_url' => $imageUrl,
        ]);

        return response()->json([
            'message' => 'Level created successfully.',
            'level' => $level
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $level = Level::findOrFail($id);
        
        $validated = $request->validate([
            'phase_id' => 'required|exists:phases,id', 
            'title' => 'required|string|max:255',
            'details' => 'required|string',
            'order_index' => 'required|integer|min:1',
            'presentation_type' => ['required', new Enum(LevelPresentationType::class)], 
            'required_request_id' => 'nullable|exists:investigation_requests,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = Phase::with('gameCase')->where('id', $validated['phase_id'])->first()?->gameCase?->title ?? 'General';

        $updateData = [
            'phase_id' => $validated['phase_id'],
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'is_initial' => filter_var($request->is_initial, FILTER_VALIDATE_BOOLEAN),
            'presentation_type' => $validated['presentation_type'],
            'required_request_id' => $validated['required_request_id'] ?? null,
        ];

        if ($request->hasFile('image')) {
            // Wipe old media (local or cloud) safely via trait
            $this->deleteMedia($level->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->storeMedia($request->file('image'), $caseTitle, 'Levels', $storeLocally);
        }

        $level->update($updateData);

        return response()->json(['message' => 'Level updated successfully.', 'level' => $level], 200);
    }

    public function destroy($id): JsonResponse
    {
        $level = Level::findOrFail($id);
        
        // Wipe associated media safely via trait
        $this->deleteMedia($level->getRawOriginal('img_url'));
        
        $level->delete();

        return response()->json(['message' => 'Level deleted.'], 200);
    }
}