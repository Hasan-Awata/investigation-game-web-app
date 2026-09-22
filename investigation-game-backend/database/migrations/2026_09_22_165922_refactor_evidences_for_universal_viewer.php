<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropColumn(['sub_type', 'metadata']);
            $table->string('theme')->nullable()->after('evidence_type');
            $table->json('pages')->nullable()->after('theme');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropColumn(['theme', 'pages']);
            $table->string('sub_type')->nullable()->after('evidence_type');
            $table->json('metadata')->nullable()->after('sub_type');
        });
    }
};