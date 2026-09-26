<?php

namespace App\Models;

use App\Enums\AssetKind;
use App\Enums\EvidenceDisk;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A binary attachment for an evidence.
 *
 * Replaces the previous img_url/audio_url column pair, where the consumer had
 * to guess whether a populated column meant anything. An asset states its kind
 * explicitly and is addressed by that kind.
 */
class EvidenceAsset extends Model
{
    use HasFactory;

    protected $table = 'evidence_assets';

    protected $fillable = [
        'evidence_id',
        'kind',
        'disk',
        'path',
        'mime',
        'bytes',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'kind' => AssetKind::class,
            'disk' => EvidenceDisk::class,
            'meta' => 'array',
            'bytes' => 'integer',
        ];
    }

    public function evidence(): BelongsTo
    {
        return $this->belongsTo(Evidence::class);
    }

    public function url(): string
    {
        if ($this->path === null || $this->path === '') {
            return '';
        }

        // A stored absolute URL belongs to a remote disk and is already usable.
        if (filter_var($this->path, FILTER_VALIDATE_URL)) {
            return $this->path;
        }

        $disk = $this->disk instanceof EvidenceDisk ? $this->disk : EvidenceDisk::Public;

        if ($disk === EvidenceDisk::Public) {
            return Storage::disk('public')->url($this->path);
        }

        return $this->path;
    }
}
