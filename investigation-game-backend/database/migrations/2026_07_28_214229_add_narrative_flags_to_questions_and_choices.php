<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void {
    Schema::table('questions', function (Blueprint $table) {
        // Distinguishes between progression blockers and optional narrative puzzles
        $table->boolean('is_mandatory')->default(true)->after('text');
    });

    Schema::table('choices', function (Blueprint $table) {
        // Maps a specific choice directly to a hidden piece of evidence
        $table->foreignId('unlocks_evidence_id')->nullable()->constrained('evidences')->nullOnDelete()->after('is_correct');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questions_and_choices', function (Blueprint $table) {
            //
        });
    }
};
