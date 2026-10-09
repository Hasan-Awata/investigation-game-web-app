<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private const RENAMED_TYPES = [
        'wiretap_authorization' => 'wiretap_warrant',
        'financial_subpoena' => 'financial_records',
    ];

    private const REMOVED_TYPES = [
        'toxicology_report',
        'ballistics_analysis',
        'digital_forensics',
        'exhumation_order',
    ];

    public function up(): void {
        foreach (self::RENAMED_TYPES as $oldType => $newType) {
            DB::table('investigation_requests')
                ->where('request_type', $oldType)
                ->update(['request_type' => $newType]);
        }

        // Legacy rows for removed types are discarded (development environment, per plan).
        // DB-level cascades clean investigation_request_items and room_investigation_requests;
        // levels.required_request_id is nulled automatically via its nullOnDelete FK
        // (the old levels.required_request_type column no longer exists).
        DB::table('investigation_requests')
            ->whereIn('request_type', self::REMOVED_TYPES)
            ->delete();

        // Keep filed-request history consistent with the surviving 5-type set.
        foreach (self::RENAMED_TYPES as $oldType => $newType) {
            DB::table('room_filed_requests')
                ->where('request_type', $oldType)
                ->update(['request_type' => $newType]);
        }

        DB::table('room_filed_requests')
            ->whereIn('request_type', self::REMOVED_TYPES)
            ->delete();
    }

    public function down(): void {
        // Best-effort inverse for renamed types only; deleted legacy rows are not recoverable.
        foreach (self::RENAMED_TYPES as $oldType => $newType) {
            DB::table('investigation_requests')
                ->where('request_type', $newType)
                ->update(['request_type' => $oldType]);

            DB::table('room_filed_requests')
                ->where('request_type', $newType)
                ->update(['request_type' => $oldType]);
        }
    }
};
