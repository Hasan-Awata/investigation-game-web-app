<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Victim;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Cloudinary\Cloudinary;

class AdminVictimController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $cloudinary = new Cloudinary(['cloud' => ['cloud_name' => env('CLOUDINARY_CLOUD_NAME'), 'api_key' => env('CLOUDINARY_API_KEY'), 'api_secret' => env('CLOUDINARY_API_SECRET')], 'url' => ['secure' => true]]);
            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), ['folder' => 'victims/images']);
            $imageUrl = $upload['secure_url'];
        }

        $victim = Victim::create(array_merge($validated, ['img_url' => $imageUrl]));
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
        ]);

        if ($request->hasFile('image')) {
            // Wipe old mugshot
            $this->deleteCloudinaryMedia($victim->img_url);

            $cloudinary = new \Cloudinary\Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'victims/images'
            ]);
            $validated['img_url'] = $upload['secure_url'];
        }

        $victim->update($validated);
        
        return response()->json(['message' => 'Victim profile updated.', 'victim' => $victim], 200);
    }

    public function destroy($id): JsonResponse
    {
        $victim = Victim::findOrFail($id);
        $this->deleteCloudinaryMedia($victim->img_url);
        $victim->delete();
        return response()->json(['message' => 'Victim deleted.'], 200);
    }

    private function deleteCloudinaryMedia(?string $url): void
    {
        if (!$url) return;
        if (preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            $cloudinary = new \Cloudinary\Cloudinary(['cloud' => ['cloud_name' => env('CLOUDINARY_CLOUD_NAME'), 'api_key' => env('CLOUDINARY_API_KEY'), 'api_secret' => env('CLOUDINARY_API_SECRET')], 'url' => ['secure' => true]]);
            try { $cloudinary->uploadApi()->destroy($matches[1], ['resource_type' => 'image']); } catch (\Exception $e) {}
        }
    }
}