<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class MediaService
{
    public function store(?UploadedFile $file, string $caseTitle, string $subfolder, bool $storeLocally): ?string
    {
        if (!$file) return null;

        return $this->storeFile($file, $caseTitle, $subfolder, $storeLocally);
    }

    /**
     * Store a file that already exists on disk (e.g. extracted from an imported
     * case bundle), reusing the exact hashing/dedup/Cloudinary pipeline as a
     * regular upload.
     */
    public function storeFromPath(
        string $absolutePath,
        string $originalName,
        string $caseTitle,
        string $subfolder,
        bool $storeLocally
    ): ?string {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            return null;
        }

        $mimeType = @mime_content_type($absolutePath) ?: null;

        // `test: true` allows wrapping a file that did not arrive via an HTTP
        // upload; `move()` falls back to a rename for such files.
        $file = new UploadedFile($absolutePath, $originalName, $mimeType, null, true);

        return $this->storeFile($file, $caseTitle, $subfolder, $storeLocally);
    }

    private function storeFile(UploadedFile $file, string $caseTitle, string $subfolder, bool $storeLocally): ?string
    {

        $caseSlug = Str::slug($caseTitle);

        // 1. Local Server Storage Path with Hashing Deduplication
        if ($storeLocally) {
            $destinationPath = public_path("assets/cases/{$caseSlug}/{$subfolder}");
            
            // Generate a cryptographic hash of the file's binary contents
            $hash = hash_file('sha256', $file->getRealPath());
            $extension = $file->getClientOriginalExtension();
            $filename = "{$hash}.{$extension}";
            
            $fullFilePath = $destinationPath . '/' . $filename;

            // `$subfolder` may be nested (e.g. 'Evidences/Blocks'), and the
            // target directory will not exist the first time a case slug is
            // seen. UploadedFile::move() does not create parents.
            if (!is_dir($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }

            // Only move the file if a file with this exact content hash doesn't already exist
            if (!file_exists($fullFilePath)) {
                $file->move($destinationPath, $filename);
            }

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
        $resourceType = $isAudio ? 'video' : 'image';

        $cloudFolder = "cases/{$caseSlug}/{$subfolder}";

        $upload = $cloudinary->uploadApi()->upload($file->getRealPath(), [
            'folder' => $cloudFolder,
            'resource_type' => $resourceType
        ]);

        return $upload['secure_url'];
    }

    public function delete(?string $url): void
    {
        if (!$url) return;

        // If it's a local public file path
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