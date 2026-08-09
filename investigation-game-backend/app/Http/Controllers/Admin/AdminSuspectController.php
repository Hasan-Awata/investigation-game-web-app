<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Traits\HandlesMedia;
use App\Models\Suspect;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminSuspectController extends Controller
{
    use HandlesMedia;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'is_guilty' => 'required|boolean', 
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $imageUrl = $this->storeMedia($request->file('image'), $caseTitle, 'People', $storeLocally);

        $suspect = Suspect::create([
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => $validated['is_initial'],
            'is_guilty' => $validated['is_guilty'], 
            'img_url' => $imageUrl,
        ]);

        return response()->json(['message' => 'Suspect added successfully.', 'suspect' => $suspect], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $suspect = Suspect::findOrFail($id);
        
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'is_guilty' => 'required|boolean', 
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $updateData = [
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => $validated['is_initial'],
            'is_guilty' => $validated['is_guilty'],
        ];

        if ($request->hasFile('image')) {
            // Wipe old mugshot (local or cloud) safely via trait
            $this->deleteMedia($suspect->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->storeMedia($request->file('image'), $caseTitle, 'People', $storeLocally);
        }

        $suspect->update($updateData);
        
        return response()->json(['message' => 'Suspect profile updated.', 'suspect' => $suspect], 200);
    }

    public function destroy($id): JsonResponse
    {
        $suspect = Suspect::findOrFail($id);
        $this->deleteMedia($suspect->getRawOriginal('img_url'));
        $suspect->delete();
        return response()->json(['message' => 'Suspect deleted.'], 200);
    }
}