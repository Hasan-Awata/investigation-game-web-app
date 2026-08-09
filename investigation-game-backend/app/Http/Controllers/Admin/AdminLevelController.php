<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Level;
use App\Enums\LevelPresentationType; 
use App\Enums\InvestigationRequestType;
use Illuminate\Validation\Rules\Enum; 
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Cloudinary\Cloudinary;

class AdminLevelController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phase_id' => 'required|exists:phases,id', 
            'title' => 'required|string|max:255',
            'details' => 'required|string',
            'order_index' => 'required|integer|min:1',
            'presentation_type' => ['required', new Enum(LevelPresentationType::class)], 
            'required_request_id' => 'nullable|exists:investigation_requests,id',            
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'levels'
            ]);
            $imageUrl = $upload['secure_url'];
        }

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
            'required_request_type' => ['nullable', new Enum(InvestigationRequestType::class)],
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $validated['is_initial'] = filter_var($request->is_initial, FILTER_VALIDATE_BOOLEAN);

        // Ensure nullability passes through if the frontend sends an empty string or omits it
        if (!array_key_exists('required_request_type', $validated) || empty($validated['required_request_type'])) {
            $validated['required_request_type'] = null;
        }

        if ($request->hasFile('image')) {
            $this->deleteCloudinaryMedia($level->img_url);

            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'levels'
            ]);
            $validated['img_url'] = $upload['secure_url'];
        }

        $level->update($validated);

        return response()->json(['message' => 'Level updated successfully.', 'level' => $level], 200);
    }

    private function deleteCloudinaryMedia(?string $url): void
    {
        if (!$url) return;
        if (preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'), 
                    'api_key' => env('CLOUDINARY_API_KEY'), 
                    'api_secret' => env('CLOUDINARY_API_SECRET')
                ], 
                'url' => ['secure' => true]
            ]);
            try { $cloudinary->uploadApi()->destroy($matches[1], ['resource_type' => 'image']); } catch (\Exception $e) {}
        }
    }
}