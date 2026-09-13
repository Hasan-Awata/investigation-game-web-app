<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. Drop the existing foreign key constraint
        Schema::table('levels', function (Blueprint $table) {
            $table->dropForeign(['phase_id']);
        });

        // 2. Rename the parent table
        Schema::rename('phases', 'zones');

        // 3. Rename the column and re-establish the foreign key constraint
        Schema::table('levels', function (Blueprint $table) {
            $table->renameColumn('phase_id', 'zone_id');
            $table->foreign('zone_id')->references('id')->on('zones')->cascadeOnDelete();
        });
    }

    public function down(): void {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropForeign(['zone_id']);
        });

        Schema::rename('zones', 'phases');

        Schema::table('levels', function (Blueprint $table) {
            $table->renameColumn('zone_id', 'phase_id');
            $table->foreign('phase_id')->references('id')->on('phases')->cascadeOnDelete();
        });
    }
};