<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MediaService
{
    public function store(?UploadedFile $file, string $caseTitle, string $subfolder, bool $storeLocally, ?int $caseId = null): ?string
    {
        if (!$file) return null;

        return $this->storeFile($file, $caseTitle, $subfolder, $storeLocally, $caseId);
    }

    /**
     * Store an existing file through the same hashing and storage pipeline as
     * an uploaded file.
     */
    public function storeFromPath(
        string $absolutePath,
        string $originalName,
        string $caseTitle,
        string $subfolder,
        bool $storeLocally,
        ?int $caseId = null
    ): ?string {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            return null;
        }

        try {
            $mimeType = File::mimeType($absolutePath) ?: null;
        } catch (\Throwable $exception) {
            Log::warning('Unable to determine media MIME type.', [
                'path' => $absolutePath,
                'error' => $exception->getMessage(),
            ]);
            $mimeType = null;
        }

        // `test: true` permits files extracted from a case bundle.
        $file = new UploadedFile($absolutePath, $originalName, $mimeType, null, true);

        return $this->storeFile($file, $caseTitle, $subfolder, $storeLocally, $caseId);
    }

    public function resolveCaseFolder(string $caseTitle, ?int $caseId = null): string
    {
        $slug = Str::slug($caseTitle);
        if ($slug === '') {
            $slug = 'case-' . substr(hash('sha256', $caseTitle), 0, 10);
        }

        return $caseId ? "{$caseId}-{$slug}" : $slug;
    }

    private function storeFile(UploadedFile $file, string $caseTitle, string $subfolder, bool $storeLocally, ?int $caseId): ?string
    {
        $caseFolder = $this->resolveCaseFolder($caseTitle, $caseId);

        if ($storeLocally) {
            $destinationPath = public_path("assets/cases/{$caseFolder}/{$subfolder}");
            $hash = hash_file('sha256', $file->getRealPath());
            $extension = $file->getClientOriginalExtension();
            $filename = "{$hash}.{$extension}";
            $fullFilePath = $destinationPath . '/' . $filename;

            if (!is_dir($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }

            if (!file_exists($fullFilePath)) {
                $file->move($destinationPath, $filename);
            }

            return "/assets/cases/{$caseFolder}/{$subfolder}/{$filename}";
        }

        $cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key' => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => ['secure' => true],
        ]);

        $isAudio = str_contains($file->getMimeType(), 'audio') || in_array($file->getClientOriginalExtension(), ['mp3', 'wav', 'ogg']);
        $resourceType = $isAudio ? 'video' : 'image';
        $cloudFolder = "cases/{$caseFolder}/{$subfolder}";
        $upload = $cloudinary->uploadApi()->upload($file->getRealPath(), [
            'folder' => $cloudFolder,
            'resource_type' => $resourceType,
        ]);

        return $upload['secure_url'];
    }

    public function isLocalPathStillReferenced(string $relativePath): bool
    {
        $normalizedPath = '/' . ltrim($relativePath, '/');
        $pathWithoutLeadingSlash = ltrim($normalizedPath, '/');
        $urlForms = [$normalizedPath, $pathWithoutLeadingSlash];

        foreach ([['cases', 'img_url'], ['levels', 'img_url'], ['questions', 'img_url'], ['characters', 'img_url'], ['evidences', 'img_url'], ['evidences', 'audio_url']] as [$table, $column]) {
            if (DB::table($table)->whereIn($column, $urlForms)->exists()) {
                return true;
            }
        }

        foreach ($urlForms as $url) {
            if (DB::table('evidences')->where('metadata', 'like', '%' . addcslashes($url, '%_\\') . '%')->exists()) {
                return true;
            }
        }

        return false;
    }

    /** @return array<int, string> */
    public function extractMetadataImageUrls(?array $metadata): array
    {
        $urls = [];
        $blocks = $metadata['doc']['blocks'] ?? [];

        if (is_array($blocks)) {
            foreach ($blocks as $block) {
                if (($block['type'] ?? '') !== 'image') {
                    continue;
                }

                $url = $block['props']['url'] ?? null;
                if (is_string($url) && trim($url) !== '') {
                    $urls[] = $url;
                }
            }
        }

        $topLevelUrl = $metadata['url'] ?? null;
        if (is_string($topLevelUrl) && trim($topLevelUrl) !== '') {
            $urls[] = $topLevelUrl;
        }

        return array_values(array_unique($urls));
    }

    public function cleanupOrphanedBlockImages(?array $oldMetadata, ?array $newMetadata): void
    {
        $removedUrls = array_diff(
            $this->extractMetadataImageUrls($oldMetadata),
            $this->extractMetadataImageUrls($newMetadata),
        );

        foreach ($removedUrls as $url) {
            $this->delete($url);
        }
    }

    public function delete(?string $url): void
    {
        if (!$url) return;

        $localPath = parse_url($url, PHP_URL_PATH) ?: $url;
        if (str_starts_with($localPath, '/assets/')) {
            if ($this->isLocalPathStillReferenced($localPath)) {
                return;
            }

            $fullPath = public_path(ltrim($localPath, '/'));
            try {
                if (File::exists($fullPath) && !File::delete($fullPath)) {
                    Log::warning("Failed to delete local media file: {$fullPath}");
                }
            } catch (\Throwable $exception) {
                Log::warning("Failed to delete local media file: {$fullPath}", ['error' => $exception->getMessage()]);
            }
            return;
        }

        if (!preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            return;
        }

        $publicId = $matches[1];
        $resourceType = str_contains($url, '/video/') ? 'video' : 'image';
        $cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key' => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => ['secure' => true],
        ]);

        try {
            $cloudinary->uploadApi()->destroy($publicId, ['resource_type' => $resourceType]);
        } catch (\Throwable $exception) {
            Log::warning("Cloudinary deletion failed for {$url}: " . $exception->getMessage());
        }
    }
}
