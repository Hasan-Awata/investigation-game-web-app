<?php

namespace App\Services\Case;

use App\Services\MediaService;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/**
 * Bridges the media references inside a case bundle (`media/...` relative
 * paths) and the media service that actually owns the bytes.
 *
 * On import: take a path inside the extracted archive and hand the bytes to
 * {@see MediaService}. On export: take a stored media URL and resolve it to a
 * local absolute path (or download it when it lives in Cloudinary).
 */
class CaseBundleMediaResolver
{
    private const REMOTE_TIMEOUT_SECONDS = 20;

    public function __construct(private readonly MediaService $mediaService) {}

    /**
     * Resolve a manifest `media/...` reference to an absolute path inside the
     * extracted bundle. Returns null when the reference is malformed, escapes
     * the archive, or points at a file that does not exist.
     */
    public function absolutePath(string $extractDir, ?string $relPath): ?string
    {
        if ($relPath === null) {
            return null;
        }

        $relPath = ltrim(str_replace('\\', '/', trim($relPath)), '/');

        if ($relPath === '' || ! str_starts_with($relPath, 'media/')) {
            return null;
        }

        if (preg_match('#(^|/)\.\.(/|$)#', $relPath)) {
            return null;
        }

        $base = realpath($extractDir);
        if ($base === false) {
            return null;
        }

        $candidate = $base.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relPath);
        $real = realpath($candidate);

        if ($real === false || ! is_file($real)) {
            return null;
        }

        $baseWithSeparator = rtrim($base, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
        if (! str_starts_with($real, $baseWithSeparator)) {
            return null;
        }

        return $real;
    }

    /**
     * Store a bundle media reference through {@see MediaService}.
     *
     * @throws ValidationException when the reference cannot be resolved.
     */
    public function resolve(
        string $extractDir,
        ?string $relPath,
        string $caseTitle,
        string $subfolder,
        bool $storeLocally,
        ?int $caseId = null
    ): ?string {
        if ($relPath === null || $relPath === '') {
            return null;
        }

        $absolutePath = $this->absolutePath($extractDir, $relPath);

        if ($absolutePath === null) {
            throw ValidationException::withMessages([
                'media' => ["Media asset '{$relPath}' could not be resolved inside the bundle."],
            ]);
        }

        return $this->mediaService->storeFromPath(
            $absolutePath,
            basename($absolutePath),
            $caseTitle,
            $subfolder,
            $storeLocally,
            $caseId
        );
    }

    /**
     * Absolute path for a locally-stored `/assets/...` URL, or null when the
     * file is missing.
     */
    public function archiveLocal(?string $url): ?string
    {
        if (! $url || ! str_starts_with($url, '/assets/')) {
            return null;
        }

        $path = public_path(ltrim($url, '/'));

        return is_file($path) ? $path : null;
    }

    /**
     * Download a remote (Cloudinary/S3) asset to a temp file, or null on
     * failure. Callers are responsible for deleting the temp file.
     */
    public function fetchRemote(?string $url): ?string
    {
        if (! $url || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        try {
            $response = Http::timeout(self::REMOTE_TIMEOUT_SECONDS)->get($url);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'case_media_');
        if ($tempPath === false) {
            return null;
        }

        if (file_put_contents($tempPath, $response->body()) === false) {
            @unlink($tempPath);

            return null;
        }

        return $tempPath;
    }
}
