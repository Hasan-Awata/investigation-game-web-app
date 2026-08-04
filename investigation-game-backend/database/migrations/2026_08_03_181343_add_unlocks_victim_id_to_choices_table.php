<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('choices', function (Blueprint $table) {
            $table->foreignId('unlocks_victim_id')->nullable()->constrained('victims')->nullOnDelete()->after('unlocks_suspect_id');
        });
    }

    public function down(): void {
        Schema::table('choices', function (Blueprint $table) {
            $table->dropForeign(['unlocks_victim_id']);
            $table->dropColumn('unlocks_victim_id');
        });
    }
};