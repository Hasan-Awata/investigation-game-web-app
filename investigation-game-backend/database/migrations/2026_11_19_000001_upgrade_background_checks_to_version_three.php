<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const RETIRED_IMAGE_FIELDS = [
        'signature', 'fingerprints',
        'right_thumb', 'right_index', 'right_middle', 'right_ring', 'right_little',
        'left_thumb', 'left_index', 'left_middle', 'left_ring', 'left_little',
    ];

    public function up(): void
    {
        DB::transaction(function () {
            DB::table('evidences')->where('metadata->template->id', 'background_check')
                ->whereIn('metadata->template->version', [1, 2])
                ->select('id', 'metadata')
                ->chunkById(100, function ($rows) {
                    foreach ($rows as $row) {
                        $metadata = json_decode($row->metadata, true, flags: JSON_THROW_ON_ERROR);
                        $values = $metadata['template']['values'];

                        foreach (self::RETIRED_IMAGE_FIELDS as $field) {
                            $image = $values[$field] ?? '';
                            if (! is_string($image) || trim($image) !== '') {
                                throw new RuntimeException("Background check evidence {$row->id} still uses uploaded artwork in {$field}. Preserve that artwork and select a shared asset before upgrading the record.");
                            }
                            unset($values[$field]);
                        }

                        $metadata['template']['version'] = 3;
                        $metadata['template']['values'] = $values + ['stamp_asset' => 'filed'];
                        DB::table('evidences')->where('id', $row->id)->update([
                            'metadata' => json_encode($metadata, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        ]);
                    }
                });
        });
    }

    public function down(): void
    {
        // Keep v3 records and any edits made after the upgrade.
    }
};
