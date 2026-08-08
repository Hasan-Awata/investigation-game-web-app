<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('room_played_wiretaps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->timestamps();
            
            // A room can only play a specific wiretap question ONCE
            $table->unique(['room_id', 'question_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('room_played_wiretaps');
    }
};