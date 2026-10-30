<?php

namespace App\Services\Case;

use App\Services\MediaService;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Psr\Http\Message\ResponseInterface;

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
        ?int $caseId = null,
        bool $isAudio = false
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
            $caseId,
            $isAudio
        );
    }

    /**
     * Absolute path for a locally-stored `/assets/...` URL, or null when the
     * file is missing.
     */
    public function archiveLocal(?string $url): ?string
    {
        return $this->mediaService->localPath($url, allowShipped: true);
    }

    /**
     * Download an approved Cloudinary asset. Callers delete the returned file.
     */
    public function fetchRemote(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        if (! $this->mediaService->ownsCloudinaryAsset($url)) {
            throw ValidationException::withMessages(['media' => 'Remote media URL is not an approved Cloudinary asset.']);
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'case_media_');
        if ($tempPath === false) {
            throw ValidationException::withMessages(['media' => 'Could not create a temporary file for remote media.']);
        }

        $maxBytes = (int) config('case_bundles.max_file_bytes');
        $sink = null;
        $response = null;
        $completed = false;
        $tooLarge = false;

        try {
            $sink = fopen($tempPath, 'w+b');
            if ($sink === false) {
                throw new \RuntimeException;
            }

            $response = Http::timeout(self::REMOTE_TIMEOUT_SECONDS)
                ->withoutRedirecting()
                ->sink($sink)
                ->withOptions([
                    'decode_content' => false,
                    'on_headers' => function (ResponseInterface $response) use ($maxBytes, &$tooLarge): void {
                        $tooLarge = (int) $response->getHeaderLine('Content-Length') > $maxBytes;
                        if ($tooLarge || $response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
                            throw new \RuntimeException;
                        }
                    },
                    'progress' => function (float $total, float $received) use ($maxBytes, &$tooLarge): void {
                        if ($total > $maxBytes || $received > $maxBytes) {
                            $tooLarge = true;
                            throw new \RuntimeException;
                        }
                    },
                ])
                ->get($url);

            $stat = fstat($sink);
            $tooLarge = $stat !== false && $stat['size'] > $maxBytes;
            if (! $response->successful() || $stat === false || $tooLarge) {
                throw new \RuntimeException;
            }

            $completed = true;

            return $tempPath;
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'media' => $tooLarge
                    ? 'Remote media exceeds the maximum allowed file size.'
                    : 'Remote media could not be downloaded.',
            ]);
        } finally {
            $response?->close();
            if (is_resource($sink)) {
                fclose($sink);
            }
            if (! $completed) {
                @unlink($tempPath);
            }
        }
    }
}
