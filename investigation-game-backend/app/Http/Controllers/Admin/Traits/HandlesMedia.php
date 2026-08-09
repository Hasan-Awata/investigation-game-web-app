<?php

namespace App\Http\Controllers\Admin\Traits;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

trait HandlesMedia
{
    protected function storeMedia(?UploadedFile $file, string $caseTitle, string $subfolder, bool $storeLocally): ?string
    {
        if (!$file) return null;

        $caseSlug = Str::slug($caseTitle);

        // 1. Local Server Storage Path
        if ($storeLocally) {
            $destinationPath = public_path("assets/cases/{$caseSlug}/{$subfolder}");
            $filename = time() . '_' . Str::random(8) . '.' . $file->getClientOriginalExtension();
            
            $file->move($destinationPath, $filename);

            return "/assets/cases/{$caseSlug}/{$subfolder}/{$filename}";
        }

        // 2. Cloudinary Cloud Storage Path
        $cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key'    => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => ['secure' => true]
        ]);

        $isAudio = str_contains($file->getMimeType(), 'audio') || in_array($file->getClientOriginalExtension(), ['mp3', 'wav', 'ogg']);
        $resourceType = $isAudio ? 'video' : 'image'; // Cloudinary requires 'video' resource type for audio files[cite: 1]

        $cloudFolder = "cases/{$caseSlug}/{$subfolder}";

        $upload = $cloudinary->uploadApi()->upload($file->getRealPath(), [
            'folder' => $cloudFolder,
            'resource_type' => $resourceType
        ]);

        return $upload['secure_url'];
    }

    protected function deleteMedia(?string $url): void
    {
        if (!$url) return;

        // If it's a local public file path (e.g., /assets/cases/...)
        if (str_starts_with($url, '/assets/')) {
            $fullPath = public_path($url);
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }
            return;
        }

        // Otherwise, process as a Cloudinary Asset URL
        if (preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            $publicId = $matches[1];
            $resourceType = str_contains($url, '/video/') ? 'video' : 'image';

            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            try {
                $cloudinary->uploadApi()->destroy($publicId, ['resource_type' => $resourceType]);
            } catch (\Exception $e) {
                // Silently fail if already missing from the cloud vault
            }
        }
    }
}