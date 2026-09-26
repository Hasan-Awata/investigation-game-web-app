<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enforces "at most one asset per kind per evidence" in the database.
 *
 * EvidenceAssetWriter::replace() reads the existing asset and updates it rather
 * than inserting a second one, so the invariant held in application code. Two
 * admins uploading an image for the same evidence at the same time could both
 * observe "no existing row" and both insert, leaving the evidence with two
 * images where every reader assumes at most one.
 *
 * The previous index on (evidence_id, kind) was non-unique, so it could not
 * catch that. A unique index doubles as the lookup index the writer needs, so
 * the old index is dropped rather than kept alongside it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evidence_assets', function (Blueprint $table) {
            // Added before the old index is dropped: the composite index is
            // what backs the evidence_id foreign key, so MySQL refuses the drop
            // while it is the only index leading with evidence_id.
            $table->unique(['evidence_id', 'kind']);
        });

        Schema::table('evidence_assets', function (Blueprint $table) {
            $table->dropIndex(['evidence_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::table('evidence_assets', function (Blueprint $table) {
            $table->index(['evidence_id', 'kind']);
        });

        Schema::table('evidence_assets', function (Blueprint $table) {
            $table->dropUnique(['evidence_id', 'kind']);
        });
    }
};
