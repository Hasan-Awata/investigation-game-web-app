// FILE: database/migrations/2026_08_02_100000_refactor_evidences_and_strikes.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. Update the default strikes on the cases table
        Schema::table('cases', function (Blueprint $table) {
            $table->integer('max_strikes')->default(3)->change();
        });

        // 2. Relink evidences to cases and add the narrative flag
        Schema::table('evidences', function (Blueprint $table) {
            // Drop the old level relation
            $table->dropForeign(['level_id']);
            $table->dropColumn('level_id');
            
            // Link directly to the case and add the initial flag
            $table->foreignId('case_id')->after('id')->constrained('cases')->cascadeOnDelete();
            $table->boolean('is_initial')->default(false)->after('paragraph');
        });
    }

    public function down(): void {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropForeign(['case_id']);
            $table->dropColumn(['case_id', 'is_initial']);
            $table->foreignId('level_id')->after('id')->constrained('levels')->cascadeOnDelete();
        });
        
        Schema::table('cases', function (Blueprint $table) {
            $table->integer('max_strikes')->default(5)->change();
        });
    }
};