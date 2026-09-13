<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::dropIfExists('room_suspects');
        Schema::dropIfExists('room_victims');
        Schema::dropIfExists('suspects');
        Schema::dropIfExists('victims');

        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('name');
            $table->text('background')->nullable();
            $table->string('img_url')->nullable();
            $table->boolean('is_initial')->default(false);
            $table->boolean('is_guilty')->default(false);
            $table->string('charge')->nullable();
            $table->string('default_status')->default('available');
            $table->timestamps();
        });

        Schema::create('room_characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
            $table->string('status');
            $table->boolean('is_unlocked')->default(true);
            $table->timestamps();

            $table->unique(['room_id', 'character_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('room_characters');
        Schema::dropIfExists('characters');
    }
};