<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('evidences', function (Blueprint $table) {
            $table->string('sub_type')->nullable()->after('evidence_type');
            $table->json('metadata')->nullable()->after('sub_type');
            
            // Drop the old monolithic text block
            $table->dropColumn('paragraph');
        });
    }

    public function down(): void {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropColumn(['sub_type', 'metadata']);
            $table->text('paragraph')->nullable()->after('img_url');
        });
    }
};