<?php

namespace App\Services\Evidence;

use App\Enums\AssetKind;
use App\Enums\EvidenceDisk;
use App\Exceptions\EvidenceAssetWriteFailed;
use App\Models\Evidence;
use App\Models\EvidenceAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use League\Flysystem\FilesystemException;

/**
 * Writes and replaces the binary attachments for an evidence.
 *
 * Assets are keyed by kind, so an evidence has at most one image, one audio
 * clip and one model. Re-uploading replaces the file rather than accumulating
 * orphans, which is what the previous img_url/audio_url pair did when an admin
 * swapped a photo and the old file stayed on disk forever.
 */
class EvidenceAssetWriter
{
    /**
     * @return list<string>
     */
    private const EXTENSIONS = [
        AssetKind::Image->value => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        AssetKind::Audio->value => ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
        AssetKind::Model3d->value => ['glb', 'gltf', 'obj'],
    ];

    public function replace(
        Evidence $evidence,
        AssetKind $kind,
        UploadedFile $file,
        ?EvidenceDisk $disk = null,
    ): EvidenceAsset {
        $disk ??= $this->defaultDiskFor($kind);

        $path = $this->storeFile($file, $evidence, $kind, $disk);

        $attributes = [
            'kind' => $kind,
            'disk' => $disk,
            'path' => $path,
            'mime' => $file->getMimeType(),
            'bytes' => $file->getSize(),
            'meta' => $this->measure($file, $kind),
        ];

        $existing = $evidence->assets()->where('kind', $kind)->first();

        if ($existing instanceof EvidenceAsset) {
            $previous = $existing->path;
            $existing->update($attributes);

            // Only unlink once the new row is safely written, so a failed
            // update never costs us the existing file.
            if ($previous !== $path) {
                $this->deleteFile($previous, $existing->disk);
            }

            return $existing->fresh();
        }

        return $evidence->assets()->create($attributes);
    }

    public function delete(Evidence $evidence, AssetKind $kind): bool
    {
        $asset = $evidence->assets()->where('kind', $kind)->first();

        if (! $asset instanceof EvidenceAsset) {
            return false;
        }

        $this->deleteFile($asset->path, $asset->disk);

        return (bool) $asset->delete();
    }

    public function defaultDiskFor(AssetKind $kind): EvidenceDisk
    {
        $configured = match ($kind) {
            AssetKind::Image => config('evidence.storage.image_disk'),
            AssetKind::Audio => config('evidence.storage.audio_disk'),
            AssetKind::Model3d => config('evidence.storage.default_disk'),
        };

        return $configured instanceof EvidenceDisk ? $configured : EvidenceDisk::Public;
    }

    /**
     * @return list<string>
     */
    public function allowedExtensions(AssetKind $kind): array
    {
        return self::EXTENSIONS[$kind->value] ?? [];
    }

    private function storeFile(UploadedFile $file, Evidence $evidence, AssetKind $kind, EvidenceDisk $disk): string
    {
        $name = Str::uuid()->toString().'.'.($file->getClientOriginalExtension() ?: 'bin');

        $directory = sprintf('cases/%d/evidences', $evidence->case_id);

        try {
            $path = Storage::disk($disk->value)->putFileAs($directory, $file, $name);
        } catch (FilesystemException $e) {
            // Flysystem raises these itself for failures that happen before the
            // write, such as being unable to create the directory. Their
            // messages embed the absolute server path, so they are converted
            // here rather than allowed to reach the client.
            throw EvidenceAssetWriteFailed::because(sprintf(
                'Could not write the %s asset for evidence %d to the "%s" disk: %s',
                $kind->value,
                $evidence->getKey(),
                $disk->value,
                $e->getMessage(),
            ), previous: $e);
        }

        // Every disk in filesystems.php sets 'throw' => false, so a failed
        // write surfaces as false rather than an exception. Returning that
        // straight out of a `string` method would surface as a TypeError deep
        // in the writer instead of a reportable upload failure.
        if ($path === false) {
            throw EvidenceAssetWriteFailed::because(sprintf(
                'Could not write the %s asset for evidence %d to the "%s" disk.',
                $kind->value,
                $evidence->getKey(),
                $disk->value,
            ));
        }

        return $path;
    }

    private function deleteFile(?string $path, ?EvidenceDisk $disk): void
    {
        if ($path === null || $path === '') {
            return;
        }

        $resolved = $disk instanceof EvidenceDisk ? $disk : EvidenceDisk::Public;

        // Remote disks are addressed by URL, not by a relative path, so there
        // is nothing to unlink locally. Their lifecycle is the provider's.
        if ($resolved === EvidenceDisk::Cloudinary || filter_var($path, FILTER_VALIDATE_URL)) {
            return;
        }

        Storage::disk($resolved->value)->delete($path);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function measure(UploadedFile $file, AssetKind $kind): ?array
    {
        if ($kind !== AssetKind::Image) {
            return null;
        }

        $size = @getimagesize($file->getRealPath());

        if ($size === false) {
            return null;
        }

        return [
            'width' => $size[0],
            'height' => $size[1],
        ];
    }
}
