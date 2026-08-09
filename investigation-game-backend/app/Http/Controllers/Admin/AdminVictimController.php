<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Traits\HandlesMedia;
use App\Models\Victim;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminVictimController extends Controller
{
    use HandlesMedia;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = GameCase::where('id', $validated['case_id'])->value('title') ?? 'General';

        $imageUrl = $this->storeMedia($request->file('image'), $caseTitle, 'People', $storeLocally);

        $victim = Victim::create([
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => $validated['is_initial'],
            'img_url' => $imageUrl,
        ]);

        return response()->json(['message' => 'Victim filed.', 'victim' => $victim], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $victim = Victim::findOrFail($id);
        
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
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
        ];

        if ($request->hasFile('image')) {
            // Wipe old mugshot (local or cloud) safely via trait
            $this->deleteMedia($victim->getRawOriginal('img_url'));
            $updateData['img_url'] = $this->storeMedia($request->file('image'), $caseTitle, 'People', $storeLocally);
        }

        $victim->update($updateData);
        
        return response()->json(['message' => 'Victim profile updated.', 'victim' => $victim], 200);
    }

    public function destroy($id): JsonResponse
    {
        $victim = Victim::findOrFail($id);
        $this->deleteMedia($victim->getRawOriginal('img_url'));
        $victim->delete();
        return response()->json(['message' => 'Victim deleted.'], 200);
    }
}