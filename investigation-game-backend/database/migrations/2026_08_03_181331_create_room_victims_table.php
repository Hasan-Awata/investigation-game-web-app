<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('room_victims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('victim_id')->constrained('victims')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('room_victims');
    }
};