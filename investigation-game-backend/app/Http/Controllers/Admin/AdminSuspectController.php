<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Suspect;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Cloudinary\Cloudinary;

class AdminSuspectController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'name' => 'required|string|max:255',
            'background' => 'nullable|string',
            'is_initial' => 'required|boolean',
            'is_guilty' => 'required|boolean', 
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

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

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'suspects/images'
            ]);
            $imageUrl = $upload['secure_url'];
        }

        $suspect = Suspect::create([
            'case_id' => $validated['case_id'],
            'name' => $validated['name'],
            'background' => $validated['background'] ?? null,
            'is_initial' => $validated['is_initial'],
            'is_guilty' => $validated['is_guilty'], // NEW
            'img_url' => $imageUrl,
        ]);

        return response()->json(['message' => 'Suspect added successfully.', 'suspect' => $suspect], 201);
    }
}