<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rebuilds `evidences` around the unified presentation model and adds
 * `evidence_assets`.
 *
 * This is a destructive, development-only migration: the previous block
 * vocabulary (13 widget types) has no mechanical translation into the new four
 * block types, so the table is dropped and recreated rather than converted.
 *
 * Four foreign keys point at evidences from other tables, all ON DELETE
 * CASCADE:
 *
 *   evidence_assets.evidence_id
 *   room_evidences.evidence_id
 *   investigation_requests.unlocks_evidence_id
 *   investigation_request_items.evidence_id
 *
 * Rather than drop and reconstruct them - which would mean hard-coding
 * constraint names that differ per driver - foreign key checking is switched
 * off for the duration. The recreated table keeps the same primary key, so
 * every existing constraint remains valid once checking is restored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('evidence_assets');
        Schema::dropIfExists('evidences');

        $this->createEvidences();
        $this->createEvidenceAssets();

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('evidence_assets');
        Schema::dropIfExists('evidences');

        // The pre-unified schema is not restored. Anything the down migration
        // would need to repopulate was already destroyed by up().
        Schema::enableForeignKeyConstraints();
    }

    private function createEvidences(): void
    {
        Schema::create('evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();

            $table->string('title');
            $table->text('description')->nullable();
            $table->string('evidence_type', 32);

            // Resolved on write by PresentationResolver and validated by
            // ViewerStrategyLegality, so a stored strategy can never drift from
            // the type it claims to present.
            $table->string('viewer_strategy', 32);
            $table->string('paper_finish', 32)->nullable();

            $table->boolean('is_initial')->default(false);
            $table->boolean('is_vital_for_conviction')->default(false);

            // Author-defined board order, replacing the old index % 5 rotation.
            $table->unsignedInteger('order_index')->default(0);

            $table->json('content_payload')->nullable();

            $table->timestamps();

            $table->index(['case_id', 'order_index']);
        });
    }

    private function createEvidenceAssets(): void
    {
        Schema::create('evidence_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evidence_id')->constrained('evidences')->cascadeOnDelete();

            $table->string('kind', 16);
            $table->string('disk', 16);
            $table->string('path', 512);
            $table->string('mime', 127)->nullable();
            $table->unsignedBigInteger('bytes')->nullable();

            // Width/height/duration, depending on the kind. Kept as a bag so a
            // new asset kind does not need a migration.
            $table->json('meta')->nullable();

            $table->timestamps();

            $table->index(['evidence_id', 'kind']);
        });
    }
};
