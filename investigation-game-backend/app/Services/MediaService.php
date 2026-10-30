<?php

namespace App\Services;

use App\Support\MediaValidationRules;
use App\Support\MetadataImageReferences;
use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
        ?int $caseId = null,
        bool $isAudio = false,
        array &$createdMedia = []
    ): ?string {
        $file = $this->validateFromPath($absolutePath, $originalName, $isAudio);

        return $this->storeFile($file, $caseTitle, $subfolder, $storeLocally, $caseId, $createdMedia);
    }

    public function validateFromPath(
        string $absolutePath,
        string $originalName,
        bool $isAudio = false,
        string $field = 'media'
    ): UploadedFile {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            throw ValidationException::withMessages([
                $field => ['The media file is missing or unreadable.'],
            ]);
        }

        $file = new UploadedFile($absolutePath, $originalName, null, null, true);
        $validator = Validator::make(
            ['media' => $file],
            ['media' => ['required', ...($isAudio ? MediaValidationRules::AUDIO : MediaValidationRules::IMAGE)]],
            [],
            ['media' => $field],
        );

        if ($validator->fails()) {
            throw ValidationException::withMessages([$field => $validator->errors()->get('media')]);
        }

        return $file;
    }

    public function resolveCaseFolder(string $caseTitle, ?int $caseId = null): string
    {
        $slug = Str::slug($caseTitle);
        if ($slug === '') {
            $slug = 'case-' . substr(hash('sha256', $caseTitle), 0, 10);
        }

        return $caseId ? "{$caseId}-{$slug}" : $slug;
    }

    private function storeFile(UploadedFile $file, string $caseTitle, string $subfolder, bool $storeLocally, ?int $caseId, array &$createdMedia = []): ?string
    {
        $caseFolder = $this->resolveCaseFolder($caseTitle, $caseId);

        if ($storeLocally) {
            $destinationPath = public_path("assets/cases/{$caseFolder}/{$subfolder}");
            $hash = hash_file('sha256', $file->getRealPath());
            $extension = $file->extension();
            $filename = "{$hash}.{$extension}";
            $fullFilePath = $destinationPath . '/' . $filename;

            if (!is_dir($destinationPath) && !@mkdir($destinationPath, 0755, true) && !is_dir($destinationPath)) {
                throw ValidationException::withMessages(['media' => 'The media directory could not be created.']);
            }

            $url = "/assets/cases/{$caseFolder}/{$subfolder}/{$filename}";
            if (!file_exists($fullFilePath)) {
                $createdMedia[] = $url;
                if (!@copy($file->getRealPath(), $fullFilePath)) {
                    throw ValidationException::withMessages(['media' => 'The media file could not be stored.']);
                }
            }

            return $url;
        }

        $cloudinary = app(Cloudinary::class, ['config' => [
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key' => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => ['secure' => true],
        ]]);

        $isAudio = str_contains($file->getMimeType(), 'audio') || in_array($file->getClientOriginalExtension(), ['mp3', 'wav', 'ogg']);
        $resourceType = $isAudio ? 'video' : 'image';
        $cloudFolder = "cases/{$caseFolder}/{$subfolder}";
        $upload = $cloudinary->uploadApi()->upload($file->getRealPath(), [
            'folder' => $cloudFolder,
            'resource_type' => $resourceType,
            'overwrite' => false,
        ]);

        $url = $upload['secure_url'] ?? null;
        if (!is_string($url) || $url === '') {
            throw ValidationException::withMessages(['media' => 'The media file could not be stored.']);
        }
        if (!($upload['existing'] ?? false)) {
            $createdMedia[] = $url;
        }

        return $url;
    }

    public function localPath(?string $url, bool $allowShipped = false): ?string
    {
        $parts = $url ? parse_url($url) : false;
        if ($parts === false || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['scheme']) && (!isset($parts['host']) || !in_array(strtolower($parts['scheme']), ['http', 'https'], true))) {
            return null;
        }

        if (isset($parts['host'])) {
            $appUrl = parse_url((string) config('app.url'));
            $port = $parts['port'] ?? (strtolower($parts['scheme'] ?? $appUrl['scheme'] ?? 'http') === 'https' ? 443 : 80);
            $appPort = $appUrl['port'] ?? (strtolower($appUrl['scheme'] ?? 'http') === 'https' ? 443 : 80);
            if (strtolower($parts['host']) !== strtolower($appUrl['host'] ?? '') || $port !== $appPort) {
                return null;
            }
        }

        $path = '/' . ltrim(rawurldecode($parts['path'] ?? ''), '/');
        if (str_contains($path, '\\') || str_contains($path, "\0") || preg_match('#(^|/)\.{1,2}(/|$)#', $path)) {
            return null;
        }

        $root = 'assets/cases/';
        if (!str_starts_with($path, '/' . $root)) {
            if (!$allowShipped || !preg_match('#^/assets/signatures/signature(?:-(?:[1-9]|1[0-8]))?\.svg$#D', $path)) {
                return null;
            }
            $root = 'assets/signatures/';
        }

        $public = realpath(public_path());
        $real = $public === false ? false : realpath($public . $path);
        if ($real === false || !is_file($real)) {
            return null;
        }

        $prefix = str_replace('\\', '/', $public) . '/' . $root;
        $candidate = str_replace('\\', '/', $real);
        if (PHP_OS_FAMILY === 'Windows') {
            $prefix = strtolower($prefix);
            $candidate = strtolower($candidate);
        }

        return str_starts_with($candidate, $prefix) ? $real : null;
    }

    public function ownsCloudinaryAsset(string $url): bool
    {
        return $this->cloudinaryAsset($url) !== null;
    }

    private function cloudinaryAsset(string $url): ?array
    {
        $cloud = (string) env('CLOUDINARY_CLOUD_NAME');
        if ($cloud === '' || !preg_match('#^https://res\.cloudinary\.com/' . preg_quote($cloud, '#') . '/(image|video)/upload/(?:v\d+/)?(cases/[a-z0-9-]+/(?:Cover|Map|Characters|Evidences(?:/Blocks)?|Levels(?:/Questions)?)/[a-zA-Z0-9_.-]+)\.[a-zA-Z0-9]+$#D', $url, $matches)) {
            return null;
        }
        if (in_array(basename($matches[2]), ['.', '..'], true)) {
            return null;
        }

        return ['resource_type' => $matches[1], 'public_id' => $matches[2]];
    }

    private function mediaIdentity(string $url): ?string
    {
        $local = $this->localPath($url);
        if ($local !== null) {
            return PHP_OS_FAMILY === 'Windows' ? strtolower($local) : $local;
        }

        $asset = $this->cloudinaryAsset($url);

        return $asset ? $asset['resource_type'] . ':' . $asset['public_id'] : null;
    }

    private function isStillReferenced(string $url): bool
    {
        $identity = $this->mediaIdentity($url);
        if ($identity === null) {
            return false;
        }

        foreach (['cases' => ['img_url', 'map_url'], 'levels' => ['img_url'], 'questions' => ['img_url'], 'characters' => ['img_url'], 'evidences' => ['img_url', 'audio_url', 'metadata']] as $table => $columns) {
            foreach (DB::table($table)->select(['id', ...$columns])->lazyById(100) as $row) {
                $urls = array_filter([$row->img_url, $row->audio_url ?? null, $row->map_url ?? null]);
                if (isset($row->metadata)) {
                    $urls = array_merge($urls, $this->extractMetadataImageUrls(json_decode($row->metadata, true)));
                }
                foreach ($urls as $reference) {
                    if ($this->mediaIdentity($reference) === $identity) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /** @return array<int, string> */
    public function extractMetadataImageUrls(?array $metadata): array
    {
        $urls = [];
        foreach (MetadataImageReferences::paths($metadata) as $url) {
            if (is_string($url) && trim($url) !== '') {
                $urls[] = $url;
            }
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

        $fullPath = $this->localPath($url);
        if ($fullPath !== null) {
            if ($this->isStillReferenced($url)) {
                return;
            }

            try {
                if (File::exists($fullPath) && !File::delete($fullPath)) {
                    Log::warning("Failed to delete local media file: {$fullPath}");
                }
            } catch (\Throwable $exception) {
                Log::warning("Failed to delete local media file: {$fullPath}", ['error' => $exception->getMessage()]);
            }
            return;
        }

        $asset = $this->cloudinaryAsset($url);
        if ($asset === null || $this->isStillReferenced($url)) {
            return;
        }

        $cloudinary = app(Cloudinary::class, ['config' => [
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key' => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => ['secure' => true],
        ]]);

        try {
            $result = $cloudinary->uploadApi()->destroy($asset['public_id'], ['resource_type' => $asset['resource_type']]);
            if (!in_array($result['result'] ?? null, ['ok', 'not found'], true)) {
                Log::warning('Cloudinary deletion did not confirm removal.');
            }
        } catch (\Throwable $exception) {
            Log::warning("Cloudinary deletion failed for {$url}: " . $exception->getMessage());
        }
    }
}
