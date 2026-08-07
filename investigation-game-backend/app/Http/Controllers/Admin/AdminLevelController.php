<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Level;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Cloudinary\Cloudinary;

class AdminLevelController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'title' => 'required|string|max:255',
            'details' => 'required|string',
            'order_index' => 'required|integer|min:1',
            'presentation_type' => 'required|string|in:standard,interrogation', 
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
                'url' => [
                    'secure' => true
                ]
            ]);

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'levels'
            ]);
            $imageUrl = $upload['secure_url'];
        }

        $level = Level::create([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'details' => $validated['details'],
            'order_index' => $validated['order_index'],
            'presentation_type' => $validated['presentation_type'], 
            'img_url' => $imageUrl,
        ]);

        return response()->json([
            'message' => 'Level created successfully.',
            'level' => $level
        ], 201);
    }
}