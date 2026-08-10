<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('choices', function (Blueprint $table) {
            // 1. Drop existing foreign key constraints
            $table->dropForeign(['unlocks_evidence_id']);
            $table->dropForeign(['unlocks_level_id']);
            $table->dropForeign(['unlocks_suspect_id']);
            $table->dropForeign(['unlocks_victim_id']);

            // 2. Drop the redundant columns
            $table->dropColumn([
                'feedback_message',
                'unlocks_evidence_id',
                'unlocks_level_id',
                'unlocks_suspect_id',
                'unlocks_victim_id'
            ]);

            // 3. Add the centralized JSON payload column
            $table->json('outcomes')->nullable()->after('is_correct');
        });
    }

    public function down(): void {
        Schema::table('choices', function (Blueprint $table) {
            $table->dropColumn('outcomes');
            
            $table->string('feedback_message')->nullable();
            $table->foreignId('unlocks_evidence_id')->nullable()->constrained('evidences')->nullOnDelete();
            $table->foreignId('unlocks_level_id')->nullable()->constrained('levels')->nullOnDelete();
            $table->foreignId('unlocks_suspect_id')->nullable()->constrained('suspects')->nullOnDelete();
            $table->foreignId('unlocks_victim_id')->nullable()->constrained('victims')->nullOnDelete();
        });
    }
};