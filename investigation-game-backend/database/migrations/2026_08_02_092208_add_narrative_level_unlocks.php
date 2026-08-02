<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. Add the initial visibility flag to levels
        Schema::table('levels', function (Blueprint $table) {
            $table->boolean('is_initial')->default(true)->after('order_index');
        });

        // 2. Add the unlock trigger to choices
        Schema::table('choices', function (Blueprint $table) {
            $table->foreignId('unlocks_level_id')->nullable()->constrained('levels')->nullOnDelete()->after('unlocks_evidence_id');
        });

        // 3. Track dynamically unlocked levels per room
        Schema::create('room_unlocked_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('level_id')->constrained('levels')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('room_unlocked_levels');
        Schema::table('choices', function (Blueprint $table) {
            $table->dropForeign(['unlocks_level_id']);
            $table->dropColumn('unlocks_level_id');
        });
        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('is_initial');
        });
    }
};