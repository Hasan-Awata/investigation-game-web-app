<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('game_rooms', function (Blueprint $table) {
            $table->json('final_stats')->nullable()->after('strikes');
        });
    }

    public function down(): void {
        Schema::table('game_rooms', function (Blueprint $table) {
            $table->dropColumn('final_stats');
        });
    }
};