<?php

namespace App\Services\Evidence;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Facades\File;

/**
 * The selectable signature SVGs, discovered from the public path.
 *
 * Adding a signature is a file drop rather than a code change, so the admin
 * form and the payload validator agree on the set without either hard-coding it.
 */
class SignatureCatalog
{
    private const CACHE_KEY = 'evidence.signatures';

    /**
     * Short enough that a dropped-in SVG shows up without a deploy, long
     * enough that the directory is not walked on every validation.
     */
    private const CACHE_TTL = 300;

    /**
     * @var list<array{id: int, name: string, path: string}>|null
     */
    private ?array $cache = null;

    public function __construct(private readonly Cache $cacheStore) {}

    /**
     * @return list<array{id: int, name: string, path: string}>
     */
    public function all(): array
    {
        if ($this->cache !== null) {
            return $this->cache;
        }

        $cached = $this->cacheStore->get(self::CACHE_KEY);

        if (is_array($cached)) {
            /** @var list<array{id: int, name: string, path: string}> $cached */
            return $this->cache = $cached;
        }

        /** @var list<array{id: int, name: string, path: string}> $scanned */
        $scanned = $this->cacheStore->remember(self::CACHE_KEY, self::CACHE_TTL, fn (): array => $this->scan());

        return $this->cache = $scanned;
    }

    /**
     * Drops the memoized and shared copies. Used by tests and by anything
     * that changes the signature directory mid-process.
     */
    public function flush(): void
    {
        $this->cache = null;
        $this->cacheStore->forget(self::CACHE_KEY);
    }

    public function exists(int $id): bool
    {
        foreach ($this->all() as $signature) {
            if ($signature['id'] === $id) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_map(static fn (array $signature): int => $signature['id'], $this->all());
    }

    /**
     * @return list<array{id: int, name: string, path: string}>
     */
    private function scan(): array
    {
        $relative = trim((string) config('evidence.signatures.path', 'assets/signatures'), '/');
        $directory = public_path($relative);

        if (! File::isDirectory($directory)) {
            return [];
        }

        $names = [];

        foreach (File::files($directory) as $file) {
            if (strtolower($file->getExtension()) !== 'svg') {
                continue;
            }

            $names[] = $file->getFilename();
        }

        // Natural order, so signature-2 comes before signature-10. Ids are
        // then assigned sequentially rather than parsed out of the filename:
        // the directory also holds an un-numbered signature.svg, which would
        // otherwise claim id 0 and make the ids depend on which files exist.
        usort($names, static fn (string $a, string $b): int => strnatcasecmp($a, $b));

        $signatures = [];

        foreach (array_values($names) as $index => $filename) {
            $signatures[] = [
                'id' => $index + 1,
                'name' => pathinfo($filename, PATHINFO_FILENAME),
                // Always a forward-slash URL path, never a Windows path.
                'path' => '/'.$relative.'/'.$filename,
            ];
        }

        return $signatures;
    }
}
