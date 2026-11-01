<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_restarts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('replacement_room_id')->nullable()->constrained('game_rooms')->nullOnDelete();
            $table->timestamps();
            $table->unique(['source_room_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_restarts');
    }
};
